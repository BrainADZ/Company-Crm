const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BRAND = {
  marketing: { name: 'BrainADZ Marketing', color: '#1D4ED8', tagline: 'Ideas That Spark Momentum' },
  exhibition: {
    name: 'BrainADZ Exhibits',
    color: '#B45309',
    tagline: 'Exhibitions, Experiences & Brand Spaces',
  },
  live: {
    name: 'BrainADZ Live',
    color: '#047857',
    tagline: 'Live Experiences & Digital Solutions',
  },
};

const money = (value) =>
  `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const safe = (value, fallback = '-') => String(value || '').trim() || fallback;
const logoBuffer = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:image\/(?:png|jpe?g);base64,(.+)$/i);
  return match ? Buffer.from(match[1], 'base64') : null;
};

const logoRoots = [
  process.env.BRAND_LOGO_DIRECTORY,
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', '..', 'crm-dashboard', 'public'),
].filter(Boolean);

const rasterFiles = (directory, depth = 0) => {
  if (!fs.existsSync(directory) || depth > 2) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return rasterFiles(entryPath, depth + 1);
    return /\.(png|jpe?g)$/i.test(entry.name) ? [entryPath] : [];
  });
};

const resolveBrandLogos = () => {
  const files = logoRoots.flatMap((directory) => rasterFiles(directory));
  const findLogo = (keywords) => files.find((file) => {
    const normalized = path.basename(file).toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes('brainadz') && keywords.some((keyword) => normalized.includes(keyword));
  }) || files.find((file) => {
    const normalized = path.basename(file).toLowerCase().replace(/[^a-z0-9]/g, '');
    return keywords.some((keyword) => normalized.includes(keyword));
  });
  const explicitLogo = (value, fallback) => (value && fs.existsSync(value) ? value : fallback);

  return {
    marketing: explicitLogo(process.env.MARKETING_LOGO_PATH, findLogo(['marketing'])),
    live: explicitLogo(process.env.LIVE_LOGO_PATH, findLogo(['live'])),
    exhibition: explicitLogo(process.env.EXHIBITS_LOGO_PATH, findLogo(['exhibit', 'exhibition', 'expo'])),
  };
};

const drawClosingPage = (doc) => {
  const logos = resolveBrandLogos();
  const verticals = [
    { key: 'marketing', name: 'BrainADZ Marketing', tagline: 'Ideas That Spark Momentum', accent: '#CA2B2D' },
    { key: 'live', name: 'BrainADZ Live', tagline: 'From Vision to Visibility', accent: '#292743' },
    { key: 'exhibition', name: 'BrainADZ Exhibits', tagline: 'Where Elegance Meets Execution', accent: '#CA2B2D' },
  ];

  doc.addPage();
  doc.rect(0, 0, 595.28, 841.89).fill('#FFFFFF');
  doc.rect(0, 0, 595.28, 8).fill('#292743');
  doc.fillColor('#292743').font('Helvetica-Bold').fontSize(42).text('BrainADZ', 42, 50, { width: 511, align: 'center' });
  doc.fillColor('#64748B').font('Helvetica').fontSize(9).text('ONE TEAM. THREE SPECIALIST VERTICALS.', 42, 105, {
    width: 511,
    align: 'center',
    characterSpacing: 1.5,
  });

  verticals.forEach((vertical, index) => {
    const x = 48 + (index * 170);
    const logo = logos[vertical.key];
    let logoDrawn = false;
    if (logo) {
      try {
        doc.image(logo, x, 155, { fit: [150, 62], align: 'center', valign: 'center' });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      doc.fillColor('#292743').font('Helvetica-Bold').fontSize(15).text(vertical.name, x, 171, { width: 150, align: 'center' });
    }
    doc.fillColor('#64748B').font('Helvetica').fontSize(7.5).text(vertical.tagline, x, 224, { width: 150, align: 'center' });
    doc.rect(x, 246, 150, 2).fill(vertical.accent);
  });

  doc.fillColor('#292743').font('Helvetica-Bold').fontSize(24).text('Thank you for the opportunity.', 70, 294, {
    width: 455,
    align: 'center',
  });
  doc.fillColor('#475569').font('Helvetica').fontSize(10.5).text(
    'We appreciate the opportunity to understand your requirements and present this proposal. Our team is committed to combining clear strategy, thoughtful creativity and reliable execution to create measurable momentum for your brand.',
    82,
    334,
    { width: 431, align: 'center', lineGap: 4 },
  );

  doc.roundedRect(55, 402, 485, 116, 8).fill('#F8FAFC').stroke('#E2E8F0');
  doc.fillColor('#292743').font('Helvetica-Bold').fontSize(11).text('WHAT HAPPENS NEXT', 75, 422);
  const nextSteps = [
    ['01', 'Review', 'Review the scope, commercials and timelines shared in this quotation.'],
    ['02', 'Confirm', 'Share your approval or questions so our specialists can align the final plan.'],
    ['03', 'Begin', 'After confirmation, we schedule the kickoff and move into execution.'],
  ];
  nextSteps.forEach(([number, title, copy], index) => {
    const x = 75 + (index * 153);
    doc.circle(x + 10, 466, 10).fill('#292743');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7).text(number, x + 2, 463, { width: 16, align: 'center' });
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(9).text(title, x + 26, 456, { width: 112 });
    doc.fillColor('#64748B').font('Helvetica').fontSize(7.5).text(copy, x + 26, 471, { width: 112, lineGap: 2 });
  });

  const cards = [
    ['PHONE', process.env.COMPANY_PHONE || '+91 95404 68023  |  +91 92890 92708'],
    ['WEB & EMAIL', `${process.env.COMPANY_WEBSITE || 'www.brainadz.com'}\n${process.env.COMPANY_EMAIL || 'preeti@brainadz.com'}`],
    ['HEAD OFFICE - NEW DELHI', process.env.COMPANY_HEAD_OFFICE || 'Apex Square 3, UGF, Plot 6, Pocket B-3, Sector 17, Dwarka, New Delhi 110075'],
    ['BRANCH OFFICE - MUMBAI', process.env.COMPANY_BRANCH_OFFICE || '643/6th Floor, iMIMA Complex, Off Link Road, Mindspace, Malad West, Mumbai 400064'],
  ];
  cards.forEach(([title, copy], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 55 + (column * 250);
    const y = 550 + (row * 104);
    doc.roundedRect(x, y, 235, 84, 7).fill('#FFFFFF').stroke('#E2E8F0');
    doc.rect(x, y, 6, 84).fill(index === 1 ? '#292743' : '#CA2B2D');
    doc.fillColor('#292743').font('Helvetica-Bold').fontSize(8).text(title, x + 20, y + 17, { width: 195 });
    doc.fillColor('#475569').font('Helvetica').fontSize(8).text(copy, x + 20, y + 35, { width: 195, lineGap: 3 });
  });
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text('Strategy. Creativity. Technology. Experiences.', 42, 790, {
    width: 511,
    align: 'center',
  });
};

const generateQuotationPdf = (quotation) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const brand = BRAND[quotation.communityKey] || BRAND.marketing;
    const unitName = quotation.businessUnitId?.name || brand.name;

    doc.rect(0, 0, 595.28, 112).fill('#FFFFFF');
    doc.rect(0, 0, 595.28, 7).fill(brand.color);
    const uploadedLogo = logoBuffer(quotation.logoDataUrl);
    let logoDrawn = false;
    if (uploadedLogo) {
      try {
        doc.image(uploadedLogo, 42, 22, { fit: [92, 48], align: 'left', valign: 'center' });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }
    if (!logoDrawn) {
      doc.roundedRect(42, 22, 48, 48, 8).fill(brand.color);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(25)
        .text('B', 42, 31, { width: 48, align: 'center' });
    }
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(unitName, logoDrawn ? 148 : 104, 28, { width: 255 });
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8.5)
      .text(brand.tagline, logoDrawn ? 148 : 104, 52, { width: 255 });
    doc
      .fillColor(brand.color)
      .font('Helvetica-Bold')
      .fontSize(19)
      .text('QUOTATION', 390, 27, { width: 163, align: 'right' });
    doc
      .fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(quotation.quotationNumber, 390, 53, { width: 163, align: 'right' });
    doc.moveTo(42, 91).lineTo(553, 91).strokeColor('#E2E8F0').stroke();

    let y = 112;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text('QUOTATION DETAILS', 42, y);
    doc.font('Helvetica').fontSize(9).fillColor('#4B5563');
    doc.text(`Date: ${quotation.quotationDate}`, 42, y + 19);
    doc.text(`Valid until: ${quotation.validUntil}`, 42, y + 34);
    doc.font('Helvetica-Bold').fillColor('#111827').text('BILL TO', 330, y);
    doc
      .font('Helvetica')
      .fillColor('#4B5563')
      .text(safe(quotation.clientCompany || quotation.clientName), 330, y + 19, { width: 220 });
    doc.text(safe(quotation.clientName), 330, y + 34, { width: 220 });
    doc.text(safe(quotation.clientEmail), 330, y + 49, { width: 220 });
    if (quotation.clientPhone) doc.text(quotation.clientPhone, 330, y + 64, { width: 220 });
    if (quotation.clientAddress) doc.text(quotation.clientAddress, 330, y + 79, { width: 220 });

    y = Math.max(y + 108, doc.y + 12);
    doc.roundedRect(42, y, 511, 42, 4).fill('#F3F4F6');
    doc
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('SUBJECT', 54, y + 9);
    doc
      .fillColor('#111827')
      .font('Helvetica')
      .fontSize(10)
      .text(safe(quotation.subject), 54, y + 23, { width: 485 });
    y += 62;

    if (quotation.customFields?.length) {
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('ADDITIONAL DETAILS', 42, y);
      y += 17;
      quotation.customFields.forEach((field, index) => {
        if (y > 700) {
          doc.addPage();
          y = 48;
        }
        const column = index % 2;
        const x = column ? 303 : 42;
        doc.roundedRect(x, y, 250, 38, 4).fill('#F8FAFC').stroke('#E2E8F0');
        doc
          .fillColor('#64748B')
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text(safe(field.label), x + 10, y + 7, { width: 230 });
        doc
          .fillColor('#1E293B')
          .font('Helvetica')
          .fontSize(8.5)
          .text(safe(field.value), x + 10, y + 20, { width: 230, height: 13, ellipsis: true });
        if (column || index === quotation.customFields.length - 1) y += 46;
      });
      y += 4;
    }

    const widths = [28, 220, 48, 72, 52, 91];
    const headers = ['#', 'Description', 'Qty', 'Rate', 'Tax', 'Amount'];
    const drawRow = (values, top, header = false) => {
      const height = header ? 27 : 34;
      doc
        .rect(42, top, 511, height)
        .fill(header ? brand.color : '#FFFFFF')
        .stroke('#D1D5DB');
      let x = 42;
      values.forEach((value, index) => {
        if (index)
          doc
            .moveTo(x, top)
            .lineTo(x, top + height)
            .strokeColor('#D1D5DB')
            .stroke();
        doc
          .fillColor(header ? '#FFFFFF' : '#374151')
          .font(header ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(header ? 8 : 8.5)
          .text(String(value), x + 5, top + (header ? 9 : 8), {
            width: widths[index] - 10,
            align: index >= 2 ? 'right' : 'left',
            height: height - 10,
            ellipsis: true,
          });
        x += widths[index];
      });
      return top + height;
    };
    y = drawRow(headers, y, true);
    quotation.items.forEach((item, index) => {
      if (y > 690) {
        doc.addPage();
        y = 48;
        y = drawRow(headers, y, true);
      }
      y = drawRow(
        [
          index + 1,
          item.description,
          item.quantity,
          money(item.unitRate),
          `${item.taxRate}%`,
          money(item.amount),
        ],
        y,
      );
    });

    y += 16;
    const totalX = 330;
    const totalLine = (label, value, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 10.5 : 9)
        .fillColor(bold ? brand.color : '#4B5563')
        .text(label, totalX, y, { width: 105 });
      doc.text(money(value), 438, y, { width: 115, align: 'right' });
      y += bold ? 22 : 17;
    };
    totalLine('Subtotal', quotation.subtotal);
    totalLine('Discount', quotation.discountAmount);
    totalLine('Taxable amount', quotation.taxableAmount);
    totalLine('GST', quotation.taxAmount);
    doc
      .moveTo(totalX, y - 4)
      .lineTo(553, y - 4)
      .strokeColor(brand.color)
      .stroke();
    totalLine('Grand total', quotation.grandTotal, true);

    if (y > 650) {
      doc.addPage();
      y = 48;
    }
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('NOTES', 42, y + 5);
    doc
      .fillColor('#4B5563')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        safe(quotation.notes, 'Thank you for the opportunity to submit this quotation.'),
        42,
        y + 20,
        { width: 500 },
      );
    y = doc.y + 14;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('TERMS & CONDITIONS', 42, y);
    doc
      .fillColor('#4B5563')
      .font('Helvetica')
      .fontSize(8.5)
      .text(safe(quotation.terms), 42, y + 15, { width: 500 });

    const footerY = 770;
    doc.moveTo(42, footerY).lineTo(553, footerY).strokeColor('#D1D5DB').stroke();
    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(8)
      .text(process.env.COMPANY_ADDRESS || 'BrainADZ · India', 42, footerY + 8, { width: 300 });
    doc.text(process.env.COMPANY_EMAIL || 'accounts@brainadz.com', 350, footerY + 8, {
      width: 203,
      align: 'right',
    });
    if (quotation.communityKey === 'marketing') drawClosingPage(doc);
    doc.end();
  });

module.exports = { generateQuotationPdf };
