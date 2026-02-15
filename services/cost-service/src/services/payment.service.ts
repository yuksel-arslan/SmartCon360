// Payment Certificate Service — Hakedis Yönetimi

import { prisma } from '../utils/prisma';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface CreatePaymentCertificateInput {
  projectId: string;
  budgetId?: string;
  periodNumber: number;
  periodStart: Date;
  periodEnd: Date;
  retentionPct?: number;
  advanceDeduction?: number;
  vatPct?: number;
  createdBy: string;
}

export interface CreatePaymentItemInput {
  workItemId: string;
  locationId?: string;
  contractQty: number;
  currentQty: number;
  unitPrice: number;
}

export class PaymentService {
  /**
   * Create new payment certificate (hakediş)
   */
  async create(input: CreatePaymentCertificateInput) {
    // Check for duplicate period number
    const existing = await prisma.paymentCertificate.findFirst({
      where: {
        projectId: input.projectId,
        periodNumber: input.periodNumber,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Payment certificate for period ${input.periodNumber} already exists`
      );
    }

    return await prisma.paymentCertificate.create({
      data: {
        ...input,
        retentionPct: input.retentionPct || 0,
        vatPct: input.vatPct || 20,
      },
    });
  }

  /**
   * Get payment certificate by ID
   */
  async findById(id: string) {
    const certificate = await prisma.paymentCertificate.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workItem: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundError('Payment certificate', id);
    }

    return certificate;
  }

  /**
   * Get all payment certificates for a project
   */
  async findByProject(projectId: string) {
    return await prisma.paymentCertificate.findMany({
      where: { projectId },
      orderBy: { periodNumber: 'asc' },
    });
  }

  /**
   * Add payment items (imalat metraji)
   */
  async addItems(certificateId: string, items: CreatePaymentItemInput[]) {
    const certificate = await this.findById(certificateId);

    // Get previous certificate to calculate cumulative
    const previousCert = await prisma.paymentCertificate.findFirst({
      where: {
        projectId: certificate.projectId,
        periodNumber: certificate.periodNumber - 1,
      },
      include: {
        items: true,
      },
    });

    const createdItems = await Promise.all(
      items.map(async (item) => {
        // Find previous quantity for this work item
        const previousItem = previousCert?.items.find(
          (pi) => pi.workItemId === item.workItemId
        );
        const previousQty = previousItem
          ? parseFloat(previousItem.cumulativeQty.toString())
          : 0;

        const currentQty = parseFloat(item.currentQty.toString());
        const cumulativeQty = previousQty + currentQty;
        const contractQty = parseFloat(item.contractQty.toString());
        const unitPrice = parseFloat(item.unitPrice.toString());

        const currentAmount = currentQty * unitPrice;
        const cumulativeAmount = cumulativeQty * unitPrice;
        const completionPct =
          contractQty > 0 ? (cumulativeQty / contractQty) * 100 : 0;

        return await prisma.paymentItem.create({
          data: {
            certificateId,
            workItemId: item.workItemId,
            locationId: item.locationId,
            contractQty,
            previousQty,
            currentQty,
            cumulativeQty,
            unitPrice,
            currentAmount,
            cumulativeAmount,
            completionPct,
          },
        });
      })
    );

    // Recalculate certificate totals
    await this.recalculateTotals(certificateId);

    return createdItems;
  }

  /**
   * Recalculate payment certificate totals
   */
  async recalculateTotals(certificateId: string) {
    const certificate = await this.findById(certificateId);

    const grossAmount = certificate.items.reduce(
      (sum, item) => sum + parseFloat(item.currentAmount.toString()),
      0
    );

    const retentionPct = parseFloat(certificate.retentionPct.toString());
    const retentionAmount = (grossAmount * retentionPct) / 100;

    const advanceDeduction = parseFloat(
      certificate.advanceDeduction.toString()
    );
    const otherDeductions = parseFloat(certificate.otherDeductions.toString());
    const priceEscalation = parseFloat(certificate.priceEscalation.toString());

    const subtotal =
      grossAmount - retentionAmount - advanceDeduction - otherDeductions + priceEscalation;

    const vatPct = parseFloat(certificate.vatPct.toString());
    const vatAmount = (subtotal * vatPct) / 100;
    const netAmount = subtotal + vatAmount;

    // Get cumulative amount
    const previousCerts = await prisma.paymentCertificate.findMany({
      where: {
        projectId: certificate.projectId,
        periodNumber: { lt: certificate.periodNumber },
      },
    });

    const cumulativeAmount =
      previousCerts.reduce(
        (sum, cert) => sum + parseFloat(cert.netAmount.toString()),
        0
      ) + netAmount;

    return await prisma.paymentCertificate.update({
      where: { id: certificateId },
      data: {
        grossAmount,
        retentionAmount,
        vatAmount,
        netAmount,
        cumulativeAmount,
      },
    });
  }

  /**
   * Submit payment certificate
   */
  async submit(certificateId: string) {
    return await prisma.paymentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'submitted',
        submittedDate: new Date(),
      },
    });
  }

  /**
   * Approve payment certificate
   */
  async approve(certificateId: string, approvedBy: string) {
    return await prisma.paymentCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'approved',
        approvedBy,
        approvedDate: new Date(),
      },
    });
  }
}

export const paymentService = new PaymentService();
