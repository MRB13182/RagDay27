import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvitationRecord, PdfSettings, WebsiteSettings } from '../types';
import defaultLogo from '../assets/images/logo.png';

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if local or asset origin blocked it
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (err) => reject(err);
      fallbackImg.src = src;
    };
    img.src = src;
  });

export const imageToDataUrl = (img: HTMLImageElement, mime = 'image/png'): string => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable.');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(mime, 0.95);
};

/**
 * Assigns permanent, immutable 1-based serial numbers (sl_no) based on the chronological
 * registration order (created_at ASC, with registration_no numeric tie-breaker).
 */
export function assignPermanentSerialNumbers(records: InvitationRecord[]): InvitationRecord[] {
  const sortedAsc = [...records].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    const numA = parseInt((a.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    const numB = parseInt((b.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    return numA - numB;
  });

  return sortedAsc.map((record, index) => ({
    ...record,
    sl_no: record.sl_no ?? (index + 1),
  }));
}

/**
 * Returns registrations formatted for Admin Panel:
 * Latest registration appears at the TOP (created_at DESC / newest first),
 * while maintaining the permanent sl_no for each student.
 */
export function sortRegistrationsForAdmin(records: InvitationRecord[]): InvitationRecord[] {
  const withPermanentSL = assignPermanentSerialNumbers(records);
  return [...withPermanentSL].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    const numA = parseInt((a.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    const numB = parseInt((b.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    return numB - numA;
  });
}

/**
 * Returns registrations formatted for PDF Ledger:
 * Oldest registration appears at the TOP (created_at ASC / oldest first),
 * and newest registration appears at the BOTTOM.
 */
export function sortRegistrationsForPDF(records: InvitationRecord[]): InvitationRecord[] {
  const withPermanentSL = assignPermanentSerialNumbers(records);
  return [...withPermanentSL].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    const numA = parseInt((a.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    const numB = parseInt((b.registration_no || '').replace(/\D+/g, ''), 10) || 0;
    return numA - numB;
  });
}

export const generateRegistrationListPDF = async (
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

  // 1. Sort records chronologically (ASC) for PDF ledger with permanent serial numbers
  const sortedRecords = sortRegistrationsForPDF(records);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark helper
  const drawWatermark = () => {
    doc.saveGraphicsState();
    // @ts-ignore
    if (doc.setGState) {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: pdfSettings.watermarkOpacity || 0.07 }));
    }
    doc.setFontSize(52);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 110, 140);
    doc.text(pdfSettings.watermarkLogo || 'RD27 OFFICIAL', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 30,
    });
    doc.restoreGraphicsState();
  };

  // Draw initial watermark
  drawWatermark();

  // 2. Redesigned PDF Header Banner (Dark Navy Blue #0B152E)
  const headerHeight = 38;
  doc.setFillColor(11, 21, 46);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Bottom separator rule (Purple / Blue #7138F5)
  doc.setFillColor(113, 56, 245);
  doc.rect(0, headerHeight - 1.2, pageWidth, 1.2, 'F');

  // Left-aligned header contents
  const textStartX = 14;

  // Main Heading: Bold, prominent uppercase "RAG DAY 27 - OFFICIAL REGISTRATION" in crisp white text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RAG DAY 27 - OFFICIAL REGISTRATION', textStartX, 12.5);

  // Subtitle: "Batch 27 Executive Committee" styled in sky-blue/cyan (#38BDF8)
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248);
  doc.text('Batch 27 Executive Committee', textStartX, 19);

  // Batch Information
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(226, 232, 240);
  doc.text('Batch 2027', textStartX, 25);

  // Event Date, Venue & Total Registrations
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const eventDateText = websiteSettings?.eventDate || 'November 20, 2026';
  const venueText = websiteSettings?.venue || 'Central Amphitheatre';
  doc.text(
    `Event Date: ${eventDateText}   |   Venue: ${venueText}   |   Total Registrations: ${sortedRecords.length}`,
    textStartX,
    31.5
  );

  // 3. Extreme Right-Side Logo Container
  const logoSource = pdfSettings?.pdfLogo || defaultLogo;
  if (logoSource) {
    try {
      const logoBoxWidth = 26;
      const logoBoxHeight = 26;
      const logoBoxX = pageWidth - 14 - logoBoxWidth; // 257mm in landscape A4
      const logoBoxY = 6;

      // Clean white rounded container card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoBoxX, logoBoxY, logoBoxWidth, logoBoxHeight, 3.5, 3.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(logoBoxX, logoBoxY, logoBoxWidth, logoBoxHeight, 3.5, 3.5, 'S');

      // Load image and render centered without stretching
      const img = await loadImage(logoSource);

      const maxLogoW = 21;
      const maxLogoH = 21;
      let drawW = maxLogoW;
      let drawH = maxLogoH;

      if (img.naturalWidth && img.naturalHeight) {
        const aspect = img.naturalWidth / img.naturalHeight;
        if (aspect > 1) {
          drawW = maxLogoW;
          drawH = maxLogoW / aspect;
        } else {
          drawH = maxLogoH;
          drawW = maxLogoH * aspect;
        }
      }

      const drawX = logoBoxX + (logoBoxWidth - drawW) / 2;
      const drawY = logoBoxY + (logoBoxHeight - drawH) / 2;

      doc.addImage(img, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not draw logo in PDF header:', e);
    }
  }

  const headCols = [
    'SL NO',
    'REG NO',
    'NAME',
    'ROLL',
    'STUDENT ID',
    'GROUP',
    'SECTION',
    'JERSEY NAME',
    'JERSEY NUMBER',
    'JERSEY SIZE',
  ];

  const tableData = sortedRecords.map((record, index) => [
    record.sl_no ?? (index + 1),
    record.registration_no,
    record.full_name,
    record.class_roll || '–',
    record.student_id || '–',
    record.academic_group || '–',
    record.academic_section || '–',
    record.jersey_back_name || '–',
    record.jersey_number ? `#${record.jersey_number}` : '–',
    record.jersey_size || '–',
  ]);

  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 14, halign: 'center' },
    1: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
    2: { cellWidth: 46, fontStyle: 'bold' },
    3: { cellWidth: 18, halign: 'center' },
    4: { cellWidth: 26, halign: 'center' },
    5: { cellWidth: 34 },
    6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    7: { cellWidth: 36, fontStyle: 'bold' },
    8: { cellWidth: 25, halign: 'center' },
    9: { cellWidth: 22, halign: 'center' },
  };

  autoTable(doc, {
    startY: 44,
    head: [headCols],
    body: tableData,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [11, 21, 46],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    margin: { top: 18, bottom: 26, left: 14, right: 14 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawWatermark();
      }
    },
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

  doc.save('RAG_DAY_27_Official_Registration.pdf');
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

  const drawTextFit = (text: string, x: number, y: number, maxWidth: number, size: number, weight: 'normal' | 'bold' | 'italic' = 'normal') => {
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

    // Base: white + subtle elegant silver atmosphere.
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F');

    doc.saveGraphicsState();
    // @ts-ignore jsPDF 4 exposes GState at runtime.
    if (doc.setGState) {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.12 }));
    }
    doc.setFillColor(192, 192, 192);
    doc.circle(18, 10, 26, 'F');
    doc.circle(150, 24, 25, 'F');
    doc.circle(102, 93, 30, 'F');
    doc.restoreGraphicsState();

    // Soft glass main information surface.
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, 17, 145, 59, 5, 5, 'F');
    doc.setDrawColor(192, 192, 192);
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
    doc.setDrawColor(192, 192, 192);
    doc.setLineWidth(0.35);
    doc.line(69, 10.6, 92, 10.6);
    doc.line(96, 10.6, 119, 10.6);
    doc.setFillColor(11, 31, 58);
    doc.lines([[1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [-1.5, -1.5]], 93.5, 10.6, [1, 1], 'F', true);

    const navy = [11, 31, 58] as [number, number, number];
    const dark = [11, 31, 58] as [number, number, number];
    const grey = [100, 116, 139] as [number, number, number];
    const lightSilver = [245, 247, 250] as [number, number, number];

    const drawGlassIcon = (x: number, y: number, kind: 'person' | 'building' | 'cap' | 'stack' | 'id' | 'calendar' | 'pin') => {
      doc.setFillColor(...lightSilver);
      doc.roundedRect(x, y, 8, 8, 2.2, 2.2, 'F');
      doc.setDrawColor(192, 192, 192);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, 8, 8, 2.2, 2.2, 'S');
      doc.saveGraphicsState();
      // @ts-ignore
      if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.85 }));
      doc.setFillColor(...navy);

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
        doc.setFillColor(...navy);
        doc.rect(x + 2.6, y + 4.1, 2.8, 1.9, 'F');
        doc.line(x + 6.2, y + 3.8, x + 6.2, y + 6.9);
        doc.circle(x + 6.2, y + 7, 0.45, 'F');
      } else if (kind === 'stack') {
        doc.setLineWidth(0.65);
        doc.setDrawColor(...navy);
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
        doc.setFillColor(...navy);
        doc.roundedRect(x + 1.3, y + 1.6, 5.4, 5.6, 0.7, 0.7, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 2.0, y + 3.2, 4.0, 3.2, 'F');
        doc.setDrawColor(...navy);
        doc.setLineWidth(0.35);
        doc.line(x + 3.0, y + 1.2, x + 3.0, y + 2.5);
        doc.line(x + 5.0, y + 1.2, x + 5.0, y + 2.5);
      } else if (kind === 'pin') {
        doc.setFillColor(...navy);
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
    doc.setDrawColor(192, 192, 192);
    doc.setLineWidth(0.7);
    doc.roundedRect(photoX - 1.8, photoY - 1.8, photoW + 3.6, photoH + 3.6, 4.3, 4.3, 'S');

    if (photoDataUrl) {
      try {
        doc.addImage(photoDataUrl, 'JPEG', photoX, photoY, photoW, photoH, undefined, 'MEDIUM');
      } catch (error) {
        console.warn('Invitation photo draw failed:', error);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(photoX, photoY, photoW, photoH, 3.5, 3.5, 'F');
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(photoX, photoY, photoW, photoH, 3.5, 3.5, 'F');
      doc.setTextColor(...navy);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(name.charAt(0).toUpperCase(), photoX + photoW / 2, photoY + photoH / 2 + 4, { align: 'center' });
    }

    // Signature rendered from student name, directly beneath photo.
    const signature = name;
    doc.setTextColor(...navy);
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
    doc.setDrawColor(192, 192, 192);
    doc.setLineWidth(0.3);
    doc.line(14, 96.1, 63, 96.1);
    doc.line(97, 96.1, 146, 96.1);
    doc.setTextColor(...navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text('Official Entry Pass', 80, 96.8, { align: 'center' });

    // Navy & silver corner accents.
    doc.setFillColor(11, 31, 58);
    doc.saveGraphicsState();
    // @ts-ignore
    if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.85 }));
    doc.circle(-1, 94, 10, 'F');
    doc.circle(-1, 101, 10, 'F');
    doc.circle(163, 2, 9, 'F');
    doc.circle(163, 9, 9, 'F');
    doc.restoreGraphicsState();

    doc.save(`RD27_Invitation_${regNo}.pdf`);
  };

  void render();
};
