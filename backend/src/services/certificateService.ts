import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

interface CertificateData {
  enrollmentId: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  instructorName: string;
  completionDate: Date;
  completedLessons: number;
  totalLessons: number;
  publishedLessons?: number;
}

/**
 * Generate a unique certificate ID
 */
export const generateCertificateId = (enrollmentId: string, studentEmail: string): string => {
  const hash = crypto
    .createHash('sha256')
    .update(`${enrollmentId}-${studentEmail}-${Date.now()}`)
    .digest('hex');
  return `CERT-${hash.substring(0, 12).toUpperCase()}`;
};

/**
 * Generate certificate PDF using PDFKit
 */
export const generateCertificatePDF = async (
  data: CertificateData & { certificateId: string }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .stroke('#1e40af');

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .stroke('#60a5fa');

      // Header - EduLearn
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('EduLearn', 0, 80, {
          align: 'center',
        });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Online Learning Platform', 0, 105, {
          align: 'center',
        });

      // Main Title
      doc
        .fontSize(42)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('CERTIFICATE', 0, 150, {
          align: 'center',
        });

      doc
        .fontSize(28)
        .fillColor('#3b82f6')
        .text('OF COMPLETION', 0, 200, {
          align: 'center',
        });

      // Decorative line
      doc
        .moveTo(250, 240)
        .lineTo(pageWidth - 250, 240)
        .lineWidth(2)
        .stroke('#3b82f6');

      // Certificate text
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#374151')
        .text('This is to certify that', 0, 270, { align: 'center' });

      // Student name
      doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(data.studentName, 0, 310, { align: 'center' });

      // Completion text
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#374151')
        .text('has successfully completed the course', 0, 365, {
          align: 'center',
        });

      // Course name
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(data.courseTitle, 100, 405, {
          width: pageWidth - 200,
          align: 'center',
        });

      // Completion stats
      const lessonText = data.publishedLessons
        ? `Completed ${data.completedLessons} of ${data.publishedLessons} published lessons`
        : `Completed ${data.completedLessons} of ${data.totalLessons} lessons`;
      
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(lessonText, 0, 460, { align: 'center' });

      // Completion date
      const dateStr = data.completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc
        .fontSize(14)
        .fillColor('#6b7280')
        .text(`Completion Date: ${dateStr}`, 0, 485, { align: 'center' });

      // Certificate ID
      doc
        .fontSize(11)
        .fillColor('#9ca3af')
        .text(`Certificate ID: ${data.certificateId}`, 0, 510, {
          align: 'center',
        });

      // Signature section
      const signatureY = 545;

      // Left signature - Instructor
      doc
        .moveTo(150, signatureY)
        .lineTo(350, signatureY)
        .lineWidth(1)
        .stroke('#9ca3af');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text(data.instructorName, 150, signatureY + 10, {
          width: 200,
          align: 'center',
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Instructor', 150, signatureY + 30, {
          width: 200,
          align: 'center',
        });

      // Right signature - EduLearn
      doc
        .moveTo(pageWidth - 350, signatureY)
        .lineTo(pageWidth - 150, signatureY)
        .lineWidth(1)
        .stroke('#9ca3af');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text('EduLearn', pageWidth - 350, signatureY + 10, {
          width: 200,
          align: 'center',
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Platform', pageWidth - 350, signatureY + 30, {
          width: 200,
          align: 'center',
        });

      // Footer
      doc
        .fontSize(9)
        .fillColor('#9ca3af')
        .text(
          'This certificate can be verified at edulearn.com/verify',
          0,
          pageHeight - 60,
          {
            align: 'center',
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Upload certificate PDF to Cloudinary
 */
export const uploadCertificateToCloudinary = async (
  pdfBuffer: Buffer,
  certificateId: string
): Promise<string> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'certificates',
          public_id: certificateId,
          resource_type: 'raw',
          format: 'pdf',
        },
        (error, result) => {
          if (error) {
            console.error('[Certificate] Cloudinary upload error:', error);
            reject(new Error('Failed to upload certificate to Cloudinary'));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('No result from Cloudinary upload'));
          }
        }
      );

      uploadStream.end(pdfBuffer);
    });
  } catch (error) {
    console.error('[Certificate] Failed to upload to Cloudinary:', error);
    throw new Error('Failed to upload certificate to cloud storage');
  }
};

/**
 * Main function: Issue certificate
 */
export const issueCertificate = async (
  data: CertificateData
): Promise<{ certificateUrl: string; certificateId: string }> => {
  try {
    console.info('[Certificate] Starting certificate generation', {
      enrollmentId: data.enrollmentId,
      studentName: data.studentName,
    });

    // Generate unique certificate ID
    const certificateId = generateCertificateId(data.enrollmentId, data.studentEmail);

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF({
      ...data,
      certificateId,
    });

    console.info('[Certificate] PDF generated', {
      certificateId,
      bufferSize: pdfBuffer.length,
    });

    // Upload to Cloudinary
    const certificateUrl = await uploadCertificateToCloudinary(pdfBuffer, certificateId);

    console.info('[Certificate] Certificate uploaded successfully', {
      certificateId,
      certificateUrl,
    });

    return {
      certificateUrl,
      certificateId,
    };
  } catch (error) {
    console.error('[Certificate] Failed to issue certificate:', {
      enrollmentId: data.enrollmentId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
