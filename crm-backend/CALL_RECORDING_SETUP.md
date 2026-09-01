# Recorded CRM calls (Exotel)

The CRM supports two call modes:

- `CALL_PROVIDER=device`: opens the device dialer and saves call activity only. It cannot capture call audio.
- `CALL_PROVIDER=exotel`: Exotel calls the employee first, then connects the client and records the bridged conversation. No calling app is required.

## Live setup

1. Create/activate an Exotel account and ExoPhone, then obtain the API key, API token, and Account SID.
2. Add these values to the backend `.env` (never commit the real secrets):

```env
CALL_PROVIDER=exotel
EXOTEL_API_KEY=...
EXOTEL_API_TOKEN=...
EXOTEL_ACCOUNT_SID=...
EXOTEL_CALLER_ID=...
EXOTEL_DEFAULT_AGENT_NUMBER=+91XXXXXXXXXX
EXOTEL_API_HOST=api.exotel.com
PUBLIC_API_URL=https://your-public-crm-api-domain.example.com
EXOTEL_WEBHOOK_TOKEN=use-a-long-random-secret
EXOTEL_DISCLOSURE_AUDIO_URL=https://your-domain.example.com/audio/call-recording-notice.wav
```

`PUBLIC_API_URL` must be public HTTPS and must route `/api` to this backend. The callback used by Exotel is:

```text
POST /api/calls/webhooks/exotel?token=<EXOTEL_WEBHOOK_TOKEN>
```

The logged-in employee's profile `phone`/`mobile` is called first. `EXOTEL_DEFAULT_AGENT_NUMBER` is used only when the profile has no valid number.

## Expected flow

1. Click the green phone button in a Sales client row.
2. The employee receives a normal call from Exotel and answers it.
3. Exotel calls the client and bridges both parties.
4. After the call ends, Exotel sends duration, result, and recording URL to the callback.
5. Open **Action → Client history**, refresh calls, and play the recording.

The optional disclosure WAV should inform both parties that the call is being recorded. Confirm the applicable consent and retention requirements before production use.
