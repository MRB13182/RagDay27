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

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark (using configured opacity and watermark text)
  doc.saveGraphicsState();
  // @ts-ignore
  if (doc.setGState) {
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: pdfSettings.watermarkOpacity || 0.08 }));
  }
  doc.setFontSize(54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 140);
  doc.text(
    pdfSettings.watermarkLogo || 'RD27 OFFICIAL',
    pageWidth / 2,
    pageHeight / 2,
    { align: 'center', angle: 30 }
  );
  doc.restoreGraphicsState();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Line
  doc.setFillColor(91, 95, 239); // #5B5FEF
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  let textStartX = 14;

  // Draw Official Logo if uploaded
  if (pdfSettings.pdfLogo) {
    try {
      // Add background white pill / round box for logo clarity
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 4, 24, 24, 3, 3, 'F');
      doc.addImage(pdfSettings.pdfLogo, 'PNG', 13, 5, 22, 22, undefined, 'FAST');
      textStartX = 40;
    } catch (e) {
      console.warn('Could not draw logo in PDF:', e);
      textStartX = 14;
    }
  }

  // Header Hierarchy:
  // [Official Logo]
  // RAG DAY 27 (RD27)
  // Official Registration Ledger
  // Batch 2027
  // Event Date & Venue
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const mainTitle = pdfSettings.pdfHeader || 'RAG DAY 27 (RD27)';
  doc.text(mainTitle, textStartX, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // Cyan-400
  const subTitle = pdfSettings.pdfSubHeader || 'Official Registration Ledger';
  doc.text(subTitle, textStartX, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240); // Slate 200
  doc.text('Batch 2027', textStartX, 22);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `Event Date: ${websiteSettings.eventDate}   |   Venue: ${websiteSettings.venue}   |   Total Registrations: ${records.length}`,
    textStartX,
    27
  );

  // Table Configuration based on Admin Role
  let headCols: string[];
  let tableData: (string | number)[][];
  let columnStyles: { [key: number]: any };

  {
    // 5 & 6. MALE & FEMALE ADMIN PDF FORMAT
    // Columns: Reg No, Student Name, Gender, Roll & ID, Group, Section, Jersey Name, Jersey Number, Jersey Size
    headCols = [
      '#',
      'Reg No',
      'Student Name',
      'Gender',
      'Roll & ID',
      'Group',
      'Section',
      'Jersey Name',
      'Jersey Number',
      'Jersey Size',
    ];
    tableData = records.map((record, index) => [
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
    columnStyles = {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 34 },
      5: { cellWidth: 34 },
      6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 34, fontStyle: 'bold' },
      8: { cellWidth: 22, halign: 'center' },
      9: { cellWidth: 20, halign: 'center' },
    };
  }

  autoTable(doc, {
    startY: 38,
    head: [headCols],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { top: 38, bottom: 26, left: 14, right: 14 },
  });

  // Footer & Signatures on final page
  const finalY = (doc as any).lastAutoTable
    ? (doc as any).lastAutoTable.finalY + 12
    : pageHeight - 35;
  const isNearBottom = finalY > pageHeight - 35;
  if (isNearBottom) {
    doc.addPage();
  }

  const signY = isNearBottom ? 30 : Math.min(finalY, pageHeight - 35);

  // Approval Statement & Signature Box
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Approval Statement: ${
      pdfSettings.approvalText ||
      'Verified and approved by Batch 27 Executive Committee. Gate entry strictly subject to verification.'
    }`,
    14,
    signY
  );
  if (pdfSettings.customNotes) {
    doc.text(`Note: ${pdfSettings.customNotes}`, 14, signY + 4.5);
  }

  // Signature lines
  const sigRight = pageWidth - 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(sigRight, signY + 12, sigRight + 45, signY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(
    pdfSettings.signatureArea || 'Authorized Signature',
    sigRight + 22.5,
    signY + 16,
    { align: 'center' }
  );
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    pdfSettings.signatureTitle || 'Rag Day Committee Convener',
    sigRight + 22.5,
    signY + 20,
    { align: 'center' }
  );

  // Page Numbers and Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      pdfSettings.footerText || `${websiteSettings.eventName} Official Document · All Rights Reserved`,
      14,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 8, {
      align: 'right',
    });
  }

  const cleanFilename = `${pdfSettings.pdfHeader || websiteSettings.eventName || 'RagDay27'}-registrations.pdf`;
  doc.save(cleanFilename);
};

export const generateInvitationCardPDF = (
  record: InvitationRecord,
  pdfSettings: PdfSettings,
  websiteSettings: WebsiteSettings
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard invitation card size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background tint
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(6, 6, pageWidth - 12, pageHeight - 12);

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(7, 7, pageWidth - 14, 28, 'F');

  // Accent Line
  doc.setFillColor(91, 95, 239);
  doc.rect(7, 34, pageWidth - 14, 2, 'F');

  // Draw logo if available
  if (pdfSettings.pdfLogo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 10, 18, 18, 2, 2, 'F');
      doc.addImage(pdfSettings.pdfLogo, 'PNG', 13, 11, 16, 16, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not draw logo on card:', e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(
    pdfSettings.invitationCardTitle || `${websiteSettings.eventName} - OFFICIAL INVITATION PASS`,
    pageWidth / 2,
    17,
    { align: 'center' }
  );

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('ADMIT ONE · NON-TRANSFERABLE GUEST CARD', pageWidth / 2, 23, {
    align: 'center',
  });
  doc.text(
    `${websiteSettings.eventDate} · ${websiteSettings.venue}`,
    pageWidth / 2,
    28,
    { align: 'center' }
  );

  // Registration Badge Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, 42, pageWidth - 24, 22, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('REGISTRATION NUMBER', 18, 50);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(91, 95, 239);
  doc.text(record.registration_no, 18, 59);

  // Status Badge
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(pageWidth - 52, 48, 34, 11, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVED PASS', pageWidth - 35, 55, { align: 'center' });

  // Student Details Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 68, pageWidth - 24, 48, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STUDENT INFORMATION', 18, 76);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  // Left column
  doc.text('Full Name:', 18, 84);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(record.full_name, 42, 84);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Roll & ID:', 18, 92);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Roll ${record.class_roll}  |  ${record.student_id}`, 42, 92);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Academic Group:', 18, 100);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.academic_group} (Section ${record.academic_section})`, 42, 100);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Gender:', 18, 108);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(record.gender.toUpperCase(), 42, 108);

  // Jersey Details Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, 120, pageWidth - 24, 25, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CUSTOM BATCH JERSEY ALLOCATION', 18, 127);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Jersey Back Name: ${record.jersey_back_name}`, 18, 135);
  doc.text(
    `Squad Number: #${record.jersey_number}   |   Size: ${record.jersey_size}`,
    18,
    141
  );

  // Verification status
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 149, pageWidth - 24, 20, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFICATION STATUS:', 18, 156);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('APPROVED', 60, 156);

  // Bottom Notice & Signatures
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    pdfSettings.approvalText ||
      'Official invitation token authorized by Rag Day 2027 Committee.',
    14,
    pageHeight - 20
  );
  doc.text(
    pdfSettings.customNotes ||
      'Please present this printed pass or digital PDF at entry checkpoint.',
    14,
    pageHeight - 16
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    pdfSettings.signatureArea || 'Authorized Signatory',
    pageWidth - 45,
    pageHeight - 20,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    pdfSettings.signatureTitle || 'Convener RD27',
    pageWidth - 45,
    pageHeight - 16,
    { align: 'center' }
  );

  doc.save(`RD27_Pass_${record.registration_no}.pdf`);
};
