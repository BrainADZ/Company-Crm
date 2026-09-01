const express = require('express');
const mongoose = require('mongoose');

const ClientDataset = require('../models/ClientDataset');
const CommunicationLog = require('../models/CommunicationLog');
const authMiddleware = require('../middleware/authMiddleware');
const { loadAuthorization } = require('../middleware/authorization');
const { getPermission } = require('../services/accessControlService');
const { writeAuditLog } = require('../services/auditService');

const router = express.Router();

const CALL_OUTCOMES = [
  'Connected',
  'No Answer',
  'Busy',
  'Switched Off',
  'Wrong Number',
  'Callback Requested',
];

const normalizeValue = (value) => String(value ?? '').trim();
const normalizeHeader = (value) => normalizeValue(value).toLowerCase();

const getCellValue = (columns, row, aliases) => {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const index = columns.findIndex((column) => normalizedAliases.includes(normalizeHeader(column)));
  return index === -1 ? '' : normalizeValue(row[index]);
};

const normalizePhoneNumber = (value) => {
  const firstValue = normalizeValue(value).split(/[\n,;|/]+/)[0] || '';
  const hasLeadingPlus = firstValue.trim().startsWith('+');
  const digits = firstValue.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return `${hasLeadingPlus ? '+' : ''}${digits}`;
};

const normalizeE164Number = (value) => {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return '';
  if (normalized.startsWith('+')) return normalized;
  if (normalized.length === 10) return `+91${normalized}`;
  if (normalized.length === 12 && normalized.startsWith('91')) return `+${normalized}`;
  return `+${normalized}`;
};

const isExotelEnabled = () => normalizeValue(process.env.CALL_PROVIDER).toLowerCase() === 'exotel';

const getExotelConfig = () => ({
  apiKey: normalizeValue(process.env.EXOTEL_API_KEY),
  apiToken: normalizeValue(process.env.EXOTEL_API_TOKEN),
  accountSid: normalizeValue(process.env.EXOTEL_ACCOUNT_SID),
  callerId: normalizeValue(process.env.EXOTEL_CALLER_ID),
  apiHost: normalizeValue(process.env.EXOTEL_API_HOST) || 'api.exotel.com',
  publicApiUrl: normalizeValue(process.env.PUBLIC_API_URL).replace(/\/$/, ''),
  webhookToken: normalizeValue(process.env.EXOTEL_WEBHOOK_TOKEN),
  disclosureAudioUrl: normalizeValue(process.env.EXOTEL_DISCLOSURE_AUDIO_URL),
});

const getMissingExotelConfig = (config) => {
  const requiredKeys = [
    'apiKey',
    'apiToken',
    'accountSid',
    'callerId',
    'publicApiUrl',
    'webhookToken',
  ];
  return requiredKeys.filter((key) => !config[key]);
};

const validateExotelConfig = (config) => {
  const missing = getMissingExotelConfig(config);

  if (missing.length) {
    throw Object.assign(
      new Error(`Exotel calling is not configured. Missing: ${missing.join(', ')}`),
      { status: 503 },
    );
  }
};

const getExotelAuthorization = (config) =>
  `Basic ${Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64')}`;

const connectExotelCall = async ({ agentNumber, clientNumber, callId }) => {
  const config = getExotelConfig();
  validateExotelConfig(config);

  const params = new URLSearchParams({
    From: agentNumber,
    To: clientNumber,
    CallerId: config.callerId,
    Record: 'true',
    RecordingChannels: 'dual',
    RecordingFormat: 'mp3',
    CustomField: String(callId),
    StatusCallback: `${config.publicApiUrl}/api/calls/webhooks/exotel?token=${encodeURIComponent(
      config.webhookToken,
    )}`,
    StatusCallbackContentType: 'application/json',
  });
  params.append('StatusCallbackEvents[]', 'terminal');
  if (config.disclosureAudioUrl) {
    params.set('StartPlaybackToNew', 'Both');
    params.set('StartPlaybackValueNew', config.disclosureAudioUrl);
  }

  const response = await fetch(
    `https://${config.apiHost}/v1/Accounts/${encodeURIComponent(
      config.accountSid,
    )}/Calls/connect`,
    {
      method: 'POST',
      headers: {
        Authorization: getExotelAuthorization(config),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    },
  );
  const responseText = await response.text();
  let responseData = {};
  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = {};
  }

  if (!response.ok) {
    const providerMessage =
      responseData.RestException?.Message ||
      responseData.message ||
      `Exotel rejected the call request (${response.status})`;
    throw Object.assign(new Error(providerMessage), { status: 502 });
  }

  return responseData.Call || responseData.call || responseData;
};

const getCallbackValue = (payload, ...keys) => {
  for (const key of keys) {
    if (payload?.[key] !== undefined && payload[key] !== null) return payload[key];
  }
  return '';
};

const getOutcomeFromProviderStatus = (status) => {
  if (status === 'completed') return 'Connected';
  if (status === 'no-answer') return 'No Answer';
  if (status === 'busy') return 'Busy';
  return '';
};

const loadAuthorizedRow = async (req, action) => {
  const datasetId = normalizeValue(req.body?.datasetId || req.query.datasetId);
  const rowIndex = Number(req.body?.rowIndex ?? req.query.rowIndex);

  if (!mongoose.isValidObjectId(datasetId)) {
    throw Object.assign(new Error('Invalid Sales dataset'), { status: 400 });
  }
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    throw Object.assign(new Error('Invalid Sales row'), { status: 400 });
  }

  if (!getPermission(req.effectivePermissions, 'leads', action)) {
    throw Object.assign(new Error(`Access denied: leads.${action} is required`), { status: 403 });
  }
  if (!getPermission(req.effectivePermissions, 'communication', action)) {
    throw Object.assign(new Error(`Access denied: communication.${action} is required`), {
      status: 403,
    });
  }

  const dataset = await ClientDataset.findById(datasetId);
  if (!dataset) throw Object.assign(new Error('Sales dataset not found'), { status: 404 });

  if (
    req.user.roleKey !== 'super_admin' &&
    !(req.user.communities || []).includes(dataset.communityKey)
  ) {
    throw Object.assign(new Error('Business Unit access denied'), { status: 403 });
  }

  const hasFullAccess =
    req.user.roleKey === 'super_admin' || String(dataset.uploadedBy || '') === String(req.user.id);
  const hasRowAccess = (dataset.rowAssignments || []).some(
    (assignment) =>
      Number(assignment.rowIndex) === rowIndex &&
      String(assignment.employee?._id || assignment.employee) === String(req.user.id),
  );

  if (!hasFullAccess && !hasRowAccess) {
    throw Object.assign(new Error('You can call only clients assigned to you'), { status: 403 });
  }
  if (rowIndex >= (dataset.rows || []).length) {
    throw Object.assign(new Error('Sales row not found'), { status: 404 });
  }

  const columns = dataset.columns || [];
  const row = dataset.rows[rowIndex] || [];
  const phoneNumber = normalizePhoneNumber(
    getCellValue(columns, row, [
      'Phone',
      'Phone Number',
      'Phone No',
      'Mobile',
      'Mobile 1',
      'Mobile Number',
      'Contact Number',
    ]),
  );
  const clientName =
    getCellValue(columns, row, [
      'Account Name',
      'Client Name',
      'Company Name',
      'Full Name',
      'Contact Name',
    ]) || `Sales row ${rowIndex + 1}`;

  return { dataset, rowIndex, phoneNumber, clientName };
};

const serializeCall = (call) => ({
  _id: call._id,
  clientName: call.clientName,
  phoneNumber: call.phoneNumber || call.contact,
  direction: call.direction,
  outcome: call.callOutcome,
  status: call.status,
  notes: call.message,
  startedAt: call.startedAt,
  endedAt: call.endedAt,
  durationSeconds: call.durationSeconds || 0,
  callProvider: call.callProvider,
  providerMode: call.callProvider === 'Exotel' ? 'cloud' : 'device',
  recordingStatus: call.recordingStatus || '',
  recordingAvailable: Boolean(call.recordingUrl),
  owner: call.owner,
  createdBy: call.createdBy,
  createdAt: call.createdAt,
});

router.post('/webhooks/exotel', async (req, res, next) => {
  try {
    const config = getExotelConfig();
    if (!config.webhookToken || normalizeValue(req.query.token) !== config.webhookToken) {
      return res.status(401).json({ message: 'Invalid Exotel callback token' });
    }

    const payload = {
      ...(req.body || {}),
      ...(req.body?.Call || req.body?.call || {}),
    };
    const providerCallId = normalizeValue(
      getCallbackValue(payload, 'CallSid', 'Sid', 'call_sid', 'callSid'),
    );
    const customField = normalizeValue(
      getCallbackValue(payload, 'CustomField', 'custom_field', 'customField'),
    );
    const providerStatus = normalizeValue(
      getCallbackValue(payload, 'Status', 'status'),
    ).toLowerCase();
    const recordingUrl = normalizeValue(
      getCallbackValue(
        payload,
        'RecordingUrl',
        'recording_url',
        'PreSignedRecordingUrl',
      ),
    );
    const duration = Number(
      getCallbackValue(payload, 'ConversationDuration', 'Duration', 'duration'),
    );

    const lookup = [];
    if (providerCallId) lookup.push({ providerCallId });
    if (mongoose.isValidObjectId(customField)) lookup.push({ _id: customField });
    if (!lookup.length) return res.status(202).json({ received: true });

    const call = await CommunicationLog.findOne({ $or: lookup, channel: 'Call' });
    if (!call) return res.status(202).json({ received: true });

    if (providerCallId) call.providerCallId = providerCallId;
    if (recordingUrl) {
      call.recordingUrl = recordingUrl;
      call.recordingStatus = 'Available';
    }
    if (Number.isFinite(duration) && duration >= 0) call.durationSeconds = duration;

    const outcome = getOutcomeFromProviderStatus(providerStatus);
    if (outcome) call.callOutcome = outcome;
    if (['completed', 'failed', 'busy', 'no-answer'].includes(providerStatus)) {
      call.status = providerStatus === 'completed' ? 'Completed' : 'Failed';
      call.endedAt = call.endedAt || new Date();
      if (!recordingUrl && providerStatus !== 'completed') call.recordingStatus = 'Failed';
      if (!call.message || call.message === 'Outbound recorded call requested from CRM.') {
        call.message = `Exotel call ${providerStatus}.`;
      }
    }

    await call.save();
    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
});

router.use(authMiddleware, loadAuthorization);

router.get('/', async (req, res, next) => {
  try {
    const context = await loadAuthorizedRow(req, 'view');
    const calls = await CommunicationLog.find({
      relatedDataset: context.dataset._id,
      rowIndex: context.rowIndex,
      channel: 'Call',
    })
      .populate('createdBy', 'name email employeeId')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ calls: calls.map(serializeCall) });
  } catch (error) {
    return next(error);
  }
});

router.get('/configuration', (req, res) => {
  const providerMode = isExotelEnabled() ? 'cloud' : 'device';
  const missingConfiguration =
    providerMode === 'cloud' ? getMissingExotelConfig(getExotelConfig()) : [];

  return res.json({
    providerMode,
    recordingEnabled: providerMode === 'cloud' && !missingConfiguration.length,
    missingConfiguration,
  });
});

router.post('/start', async (req, res, next) => {
  try {
    const context = await loadAuthorizedRow(req, 'create');
    if (!context.phoneNumber) {
      return res.status(400).json({ message: 'This client does not have a valid phone number' });
    }

    const useExotel = isExotelEnabled();
    const exotelConfig = getExotelConfig();
    if (useExotel) validateExotelConfig(exotelConfig);

    const agentNumber = [
      req.user.phone,
      req.user.mobile,
      process.env.EXOTEL_DEFAULT_AGENT_NUMBER,
    ]
      .map(normalizeE164Number)
      .find(Boolean);
    if (useExotel && !agentNumber) {
      return res.status(400).json({
        message:
          'Your employee profile needs a valid phone number for recorded CRM calling.',
      });
    }

    const clientNumber = normalizeE164Number(context.phoneNumber);
    const startedAt = new Date();
    const call = await CommunicationLog.create({
      communityKey: context.dataset.communityKey,
      officeModule: context.dataset.officeModule || 'Sales',
      team: context.dataset.team || '',
      linkedUserIds: [req.user._id],
      clientName: context.clientName,
      contact: context.phoneNumber,
      phoneNumber: context.phoneNumber,
      channel: 'Call',
      type: 'Follow-up',
      message: useExotel
        ? 'Outbound recorded call requested from CRM.'
        : 'Outbound device-dialer call initiated from CRM (audio not recorded).',
      status: 'Initiated',
      direction: 'Outbound',
      startedAt,
      callProvider: useExotel ? 'Exotel' : 'Device Dialer',
      recordingStatus: useExotel ? 'Pending' : '',
      owner: req.user.name || req.user.email || 'CRM User',
      relatedDataset: context.dataset._id,
      rowIndex: context.rowIndex,
      createdBy: req.user._id,
    });

    if (useExotel) {
      try {
        const providerCall = await connectExotelCall({
          agentNumber,
          clientNumber,
          callId: call._id,
        });
        call.providerCallId = normalizeValue(providerCall.Sid || providerCall.sid);
        await call.save();
      } catch (providerError) {
        call.status = 'Failed';
        call.recordingStatus = 'Failed';
        call.endedAt = new Date();
        call.message = `Exotel call could not start: ${providerError.message}`;
        await call.save();
        throw providerError;
      }
    }

    await writeAuditLog({
      req,
      action: 'sales_call_started',
      resource: 'communication',
      resourceId: call._id,
      newValue: call.toObject(),
      communityKey: call.communityKey,
    });

    return res.status(201).json({
      message: useExotel
        ? 'Exotel is calling your registered phone. Answer it to connect with the client.'
        : 'Device dialer opened. This fallback logs the call but cannot record its audio.',
      call: serializeCall(call),
      providerMode: useExotel ? 'cloud' : 'device',
      recordingEnabled: useExotel,
      dialUrl: useExotel ? '' : `tel:${context.phoneNumber}`,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:callId/recording', async (req, res, next) => {
  try {
    const context = await loadAuthorizedRow(req, 'view');
    const call = await CommunicationLog.findOne({
      _id: req.params.callId,
      relatedDataset: context.dataset._id,
      rowIndex: context.rowIndex,
      channel: 'Call',
    });
    if (!call) return res.status(404).json({ message: 'Call record not found' });
    if (!call.recordingUrl) {
      return res.status(404).json({ message: 'Recording is not available yet' });
    }

    const recordingLocation = new URL(call.recordingUrl);
    const isAllowedRecordingHost =
      recordingLocation.protocol === 'https:' &&
      (recordingLocation.hostname === 'exotel.com' ||
        recordingLocation.hostname.endsWith('.exotel.com') ||
        recordingLocation.hostname === 'exotel.in' ||
        recordingLocation.hostname.endsWith('.exotel.in'));
    if (!isAllowedRecordingHost) {
      return res.status(502).json({ message: 'Invalid recording location received from provider' });
    }

    const config = getExotelConfig();
    validateExotelConfig(config);
    const recordingResponse = await fetch(recordingLocation, {
      headers: { Authorization: getExotelAuthorization(config) },
    });
    if (!recordingResponse.ok) {
      return res.status(502).json({ message: 'Unable to download recording from Exotel' });
    }

    const recording = Buffer.from(await recordingResponse.arrayBuffer());
    res.set({
      'Content-Type': recordingResponse.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(recording.length),
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="call-${call._id}.mp3"`,
    });
    return res.send(recording);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:callId/complete', async (req, res, next) => {
  try {
    const context = await loadAuthorizedRow(req, 'update');
    const outcome = normalizeValue(req.body.outcome);
    const notes = normalizeValue(req.body.notes);

    if (!CALL_OUTCOMES.includes(outcome)) {
      return res.status(400).json({ message: 'Select a valid call outcome' });
    }

    const call = await CommunicationLog.findOne({
      _id: req.params.callId,
      relatedDataset: context.dataset._id,
      rowIndex: context.rowIndex,
      channel: 'Call',
    });
    if (!call) return res.status(404).json({ message: 'Call record not found' });

    const endedAt = new Date();
    const measuredDuration = call.startedAt
      ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
      : 0;
    const requestedDuration = Number(req.body.durationSeconds);

    call.callOutcome = outcome;
    call.status = 'Completed';
    call.endedAt = endedAt;
    call.durationSeconds = Number.isFinite(requestedDuration)
      ? Math.max(0, Math.min(Math.round(requestedDuration), 86400))
      : Math.min(measuredDuration, 86400);
    call.message = notes || `${outcome} call logged from CRM.`;
    await call.save();
    await call.populate('createdBy', 'name email employeeId');

    await writeAuditLog({
      req,
      action: 'sales_call_completed',
      resource: 'communication',
      resourceId: call._id,
      newValue: call.toObject(),
      communityKey: call.communityKey,
    });

    return res.json({ message: 'Call outcome saved successfully', call: serializeCall(call) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
