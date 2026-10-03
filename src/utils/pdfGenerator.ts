import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvitationRecord, PdfSettings, WebsiteSettings } from '../types';

export const generateRegistrationListPDF = (
  records: InvitationRecord[],
  pdfSettings: PdfSettings,
  websiteSettings: WebsiteSettings,
  adminRole: 'male_admin' | 'female_admin'
) => {
  const expectedGender =
    adminRole === 'male_admin' ? 'male' : adminRole === 'female_admin' ? 'female' : null;

  if (!expectedGender) {
    throw new Error('Invalid admin role for registration ledger PDF.');
  }
  if (records.some(record => record.gender !== expectedGender)) {
    throw new Error(`Registration ledger contains records outside the ${adminRole} scope.`);
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.saveGraphicsState();
  // @ts-ignore
  if (doc.setGState) {
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: pdfSettings.watermarkOpacity || 0.08 }));
  }
  doc.setFontSize(54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 140);
  doc.text(pdfSettings.watermarkLogo || 'RD27 OFFICIAL', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 30,
  });
  doc.restoreGraphicsState();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFillColor(91, 95, 239);
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  let textStartX = 14;
  if (pdfSettings.pdfLogo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 4, 24, 24, 3, 3, 'F');
      doc.addImage(pdfSettings.pdfLogo, 'PNG', 13, 5, 22, 22, undefined, 'FAST');
      textStartX = 40;
    } catch (e) {
      console.warn('Could not draw logo in PDF:', e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfSettings.pdfHeader || 'RAG DAY 27 (RD27)', textStartX, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248);
  doc.text(pdfSettings.pdfSubHeader || 'Official Registration Ledger', textStartX, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('Batch 2027', textStartX, 22);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Event Date: ${websiteSettings.eventDate}   |   Venue: ${websiteSettings.venue}   |   Total Registrations: ${records.length}`,
    textStartX,
    27
  );

  const headCols = ['#', 'Reg No', 'Student Name', 'Gender', 'Roll & ID', 'Group', 'Section', 'Jersey Name', 'Jersey Number', 'Jersey Size'];
  const tableData = records.map((record, index) => [
    index + 1,
    record.registration_no,
    record.full_name,
    record.gender.toUpperCase(),
    `Roll: ${record.class_roll}\nID: ${record.student_id}`,
    record.academic_group,
    record.academic_section,
    record.jersey_back_name,
    `#${record.jersey_number}`,
    record.jersey_size,
  ]);
  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
    2: { cellWidth: 42, fontStyle: 'bold' }, 3: { cellWidth: 20, halign: 'center' },
    4: { cellWidth: 34 }, 5: { cellWidth: 34 }, 6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    7: { cellWidth: 34, fontStyle: 'bold' }, 8: { cellWidth: 22, halign: 'center' }, 9: { cellWidth: 20, halign: 'center' },
  };

  autoTable(doc, {
    startY: 38,
    head: [headCols],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    margin: { top: 38, bottom: 26, left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : pageHeight - 35;
  const isNearBottom = finalY > pageHeight - 35;
  if (isNearBottom) doc.addPage();
  const signY = isNearBottom ? 30 : Math.min(finalY, pageHeight - 35);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Approval Statement: ${pdfSettings.approvalText || 'Verified and approved by Batch 27 Executive Committee. Gate entry strictly subject to verification.'}`,
    14,
    signY
  );
  if (pdfSettings.customNotes) doc.text(`Note: ${pdfSettings.customNotes}`, 14, signY + 4.5);

  const sigRight = pageWidth - 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sigRight, signY + 12, sigRight + 45, signY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(pdfSettings.signatureArea || 'Authorized Signature', sigRight + 22.5, signY + 16, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSettings.signatureTitle || 'Rag Day Committee Convener', sigRight + 22.5, signY + 20, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(pdfSettings.footerText || `${websiteSettings.eventName} Official Document · All Rights Reserved`, 14, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  doc.save(`${pdfSettings.pdfHeader || websiteSettings.eventName || 'RagDay27'}-registrations.pdf`);
};

export const generateInvitationCardPDF = (
  record: InvitationRecord,
  _pdfSettings: PdfSettings,
  _websiteSettings: WebsiteSettings
) => {
  if (!record || record.status !== 'approved') {
    throw new Error('An approved database registration is required to generate the invitation card.');
  }
  if (!record.registration_no || !record.full_name) {
    throw new Error('The selected registration record is incomplete.');
  }

  const pdfWidth = 160;
  const pdfHeight = 100;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
    compress: true,
  });

  // Load the actual database photo and site logo before any drawing so jsPDF receives real image data.
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Unable to load image: ${src}`));
      img.src = src;
    });

  const imageToDataUrl = (img: HTMLImageElement, mime = 'image/jpeg') => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable.');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(mime, 0.94);
  };

  const drawTextFit = (text: string, x: number, y: number, maxWidth: number, size: number, weight: 'normal' | 'bold' = 'normal') => {
    let fontSize = size;
    doc.setFont('helvetica', weight);
    do {
      doc.setFontSize(fontSize);
      if (doc.getTextWidth(text) <= maxWidth || fontSize <= 5.5) break;
      fontSize -= 0.5;
    } while (fontSize > 5);
    doc.text(text, x, y);
  };

  const safeEventDate = '15 December 2027';
  const safeVenue = 'National Ideal College Campus';
  const name = record.full_name.trim();
  const section = record.academic_section?.trim() || '—';
  const roll = record.class_roll?.trim() || '—';
  const group = record.academic_group?.trim() || '—';
  const regNo = record.registration_no.trim();

  const render = async () => {
    let photoDataUrl: string | null = null;
    let logoDataUrl: string | null = null;

    if (record.student_photo) {
      try {
        const photo = await loadImage(record.student_photo);
        photoDataUrl = imageToDataUrl(photo, 'image/jpeg');
      } catch (error) {
        console.warn('Invitation photo could not be loaded:', error);
      }
    }

    if (_pdfSettings.pdfLogo) {
      try {
        const logo = await loadImage(_pdfSettings.pdfLogo);
        logoDataUrl = imageToDataUrl(logo, 'image/png');
      } catch (error) {
        console.warn('Invitation logo could not be loaded:', error);
      }
    }

    // Base: white + very light lavender/violet atmosphere.
    doc.setFillColor(251, 250, 255);
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F');

    doc.saveGraphicsState();
    // @ts-ignore jsPDF 4 exposes GState at runtime.
    if (doc.setGState) {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.15 }));
    }
    doc.setFillColor(139, 92, 246);
    doc.circle(18, 10, 26, 'F');
    doc.circle(150, 24, 25, 'F');
    doc.circle(102, 93, 30, 'F');
    doc.restoreGraphicsState();

    // Soft glass main information surface.
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, 17, 145, 59, 5, 5, 'F');
    doc.setDrawColor(233, 227, 247);
    doc.setLineWidth(0.7);
    doc.roundedRect(8, 17, 145, 59, 5, 5, 'S');

    // Logo + brand at upper-left.
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 9.5, 3.1, 17, 14.2, undefined, 'MEDIUM');
      } catch (error) {
        console.warn('Invitation logo draw failed:', error);
      }
    }
    drawTextFit('National Ideal College', 28, 8.8, 63, 13.4, 'bold');
    drawTextFit('Rag Day of NIC 27', 28, 14.3, 59, 7.8, 'normal');

    // Academic decorative divider.
    doc.setDrawColor(147, 136, 175);
    doc.setLineWidth(0.35);
    doc.line(69, 10.6, 92, 10.6);
    doc.line(96, 10.6, 119, 10.6);
    doc.setFillColor(111, 76, 154);
    doc.lines([[1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [-1.5, -1.5]], 93.5, 10.6, [1, 1], 'F', true);

    const purple = [109, 40, 217] as [number, number, number];
    const dark = [31, 23, 48] as [number, number, number];
    const grey = [58, 57, 66] as [number, number, number];
    const lightPurple = [245, 240, 255] as [number, number, number];

    const drawGlassIcon = (x: number, y: number, kind: 'person' | 'building' | 'cap' | 'stack' | 'id' | 'calendar' | 'pin') => {
      doc.setFillColor(...lightPurple);
      doc.roundedRect(x, y, 8, 8, 2.2, 2.2, 'F');
      doc.setDrawColor(220, 204, 244);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, 8, 8, 2.2, 2.2, 'S');
      doc.saveGraphicsState();
      // @ts-ignore
      if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.75 }));
      doc.setFillColor(...purple);

      if (kind === 'person') {
        doc.circle(x + 4, y + 2.8, 1.55, 'F');
        doc.ellipse(x + 4, y + 5.8, 2.55, 1.55, 'F');
      } else if (kind === 'building') {
        doc.rect(x + 2.0, y + 2.0, 4, 4.8, 'F');
        doc.rect(x + 0.9, y + 3.8, 1.1, 3, 'F');
        doc.rect(x + 6.0, y + 3.8, 1.1, 3, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 3.1, y + 4, 0.9, 1.2, 'F');
        doc.rect(x + 4.8, y + 4, 0.9, 1.2, 'F');
        doc.rect(x + 3.6, y + 6.0, 0.8, 0.8, 'F');
      } else if (kind === 'cap') {
        doc.lines([[4,-2],[4,2],[-4,2],[-4,-2]], x + 4, y + 3.2, [1,1], 'F', true);
        doc.setFillColor(...purple);
        doc.rect(x + 2.6, y + 4.1, 2.8, 1.9, 'F');
        doc.line(x + 6.2, y + 3.8, x + 6.2, y + 6.9);
        doc.circle(x + 6.2, y + 7, 0.45, 'F');
      } else if (kind === 'stack') {
        doc.setLineWidth(0.65);
        doc.setDrawColor(...purple);
        doc.lines([[5,-1.8],[-5,1.8],[5,1.8],[5,3.2],[-5,-1.8]], x + 4, y + 2.1, [1,1], 'S', true);
        doc.lines([[5,-1.8],[-5,1.8],[5,1.8]], x + 4, y + 4.2, [1,1], 'S', true);
        doc.lines([[5,-1.8],[-5,1.8],[5,1.8]], x + 4, y + 6.1, [1,1], 'S', true);
      } else if (kind === 'id') {
        doc.roundedRect(x + 1.3, y + 1.6, 5.4, 4.9, 0.9, 0.9, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(x + 2.55, y + 3.15, 0.8, 'F');
        doc.roundedRect(x + 3.65, y + 2.5, 2.0, 0.55, 0.2, 0.2, 'F');
        doc.roundedRect(x + 3.65, y + 3.7, 1.5, 0.55, 0.2, 0.2, 'F');
      } else if (kind === 'calendar') {
        doc.setFillColor(...purple);
        doc.roundedRect(x + 1.3, y + 1.6, 5.4, 5.6, 0.7, 0.7, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 2.0, y + 3.2, 4.0, 3.2, 'F');
        doc.setDrawColor(...purple);
        doc.setLineWidth(0.35);
        doc.line(x + 3.0, y + 1.2, x + 3.0, y + 2.5);
        doc.line(x + 5.0, y + 1.2, x + 5.0, y + 2.5);
      } else if (kind === 'pin') {
        doc.setFillColor(...purple);
        doc.circle(x + 4, y + 3.4, 2.35, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(x + 4, y + 3.4, 0.85, 'F');
        doc.triangle(x + 1.9, y + 4.0, x + 6.1, y + 4.0, x + 4, y + 7.3, 'F');
      }
      doc.restoreGraphicsState();
    };

    const rows = [
      { icon: 'person' as const, label: 'Name:', value: name, y: 30.2, valueX: 33, max: 56 },
      { icon: 'building' as const, label: 'Section:', value: section, y: 39.5, valueX: 33, max: 56 },
      { icon: 'cap' as const, label: 'Roll:', value: roll, y: 48.8, valueX: 28, max: 22 },
      { icon: 'stack' as const, label: 'Group:', value: group, y: 58.0, valueX: 28, max: 61 },
      { icon: 'id' as const, label: 'Registration No:', value: regNo, y: 67.4, valueX: 45, max: 42 },
    ];

    doc.setFont('helvetica', 'normal');
    for (const row of rows) {
      drawGlassIcon(12, row.y - 5.0, row.icon);
      doc.setTextColor(...grey);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(row.label === 'Registration No:' ? 6.4 : 7.8);
      doc.text(row.label, 23.5, row.y);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'bold');
      drawTextFit(row.value, row.valueX, row.y, row.max, row.label === 'Registration No:' ? 8.2 : 8.4, 'bold');
    }

    // Actual photo on right.
    const photoX = 101.8, photoY = 18.7, photoW = 44.0, photoH = 49.4;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(photoX - 1.8, photoY - 1.8, photoW + 3.6, photoH + 3.6, 4.3, 4.3, 'F');
    doc.setDrawColor(227, 221, 241);
    doc.setLineWidth(0.7);
    doc.roundedRect(photoX - 1.8, photoY - 1.8, photoW + 3.6, photoH + 3.6, 4.3, 4.3, 'S');

    if (photoDataUrl) {
      try {
        doc.addImage(photoDataUrl, 'JPEG', photoX, photoY, photoW, photoH, undefined, 'MEDIUM');
      } catch (error) {
        console.warn('Invitation photo draw failed:', error);
        doc.setFillColor(245, 240, 252);
        doc.roundedRect(photoX, photoY, photoW, photoH, 3.5, 3.5, 'F');
      }
    } else {
      doc.setFillColor(245, 240, 252);
      doc.roundedRect(photoX, photoY, photoW, photoH, 3.5, 3.5, 'F');
      doc.setTextColor(...purple);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(name.charAt(0).toUpperCase(), photoX + photoW / 2, photoY + photoH / 2 + 4, { align: 'center' });
    }

    // Signature rendered from student name, directly beneath photo.
    const signature = name;
    doc.setTextColor(58, 22, 86);
    drawTextFit(signature, 123.8, 74.5, 47, 10.4, 'italic');

    // Bottom event information.
    const eventY = 90.0;
    drawGlassIcon(12, eventY - 4.6, 'calendar');
    doc.setFontSize(7.7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text('Event Date:', 23.5, eventY);
    drawTextFit(safeEventDate, 48.8, eventY, 47, 7.7, 'normal');

    drawGlassIcon(86, eventY - 4.6, 'pin');
    doc.setFont('helvetica', 'bold');
    doc.text('Venue:', 97.5, eventY);
    drawTextFit(safeVenue, 112.0, eventY, 39, 7.7, 'normal');

    // Footer label + lines.
    doc.setDrawColor(168, 157, 193);
    doc.setLineWidth(0.3);
    doc.line(14, 96.1, 63, 96.1);
    doc.line(97, 96.1, 146, 96.1);
    doc.setTextColor(68, 61, 79);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text('Official Entry Pass', 80, 96.8, { align: 'center' });

    // Violet corner ribbon/academic accents.
    doc.setFillColor(108, 46, 205);
    doc.saveGraphicsState();
    // @ts-ignore
    if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.9 }));
    doc.circle(-1, 94, 10, 'F');
    doc.circle(-1, 101, 10, 'F');
    doc.circle(163, 2, 9, 'F');
    doc.circle(163, 9, 9, 'F');
    doc.restoreGraphicsState();

    doc.save(`RD27_Invitation_${regNo}.pdf`);
  };

  void render();
};
