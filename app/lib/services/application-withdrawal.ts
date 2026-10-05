import prisma, { type TransactionClient } from "@/app/lib/prisma";
import { AnimalListingStatus, ApplicationStatus } from "@/prisma/generated/enums";
import { isOwnedByUser } from "@/app/lib/auth/ownership";
import {
  DERIVATION_APPLICATION_SELECT,
  effectiveApplicationStatus,
  effectiveStatusBehindLock,
  type DerivationApplicationRow,
} from "@/app/lib/data/application-status.data";
import { NON_WITHDRAWABLE_STATUSES } from "@/app/lib/utils/application-status";
import type { EffectiveApplicationStatus } from "@/app/lib/utils/derive-application-status";
import { formatSingleEnumOption } from "@/app/lib/utils/enum-formatter";
import { ConflictError, NotFoundError } from "@/app/lib/utils/errors";



export interface WithdrawableApplication {
  application: DerivationApplicationRow;
  
  currentStatus: EffectiveApplicationStatus;
}


export const checkWithdrawal = async (
  applicationId: string,
  personId: string,
): Promise<WithdrawableApplication> => {
  const application = await prisma.adoptionApplication.findUnique({
    where: { id: applicationId },
    select: { applicantId: true, ...DERIVATION_APPLICATION_SELECT },
  });

  if (!isOwnedByUser(application, personId)) {
    throw new NotFoundError("Adoption Application not found.");
  }

  
  const currentStatus = await effectiveApplicationStatus(application);

  if (NON_WITHDRAWABLE_STATUSES.includes(currentStatus)) {
    throw new ConflictError(
      `Cannot withdraw application. Its status is currently "${formatSingleEnumOption(currentStatus)}".`,
    );
  }

  return { application, currentStatus };
};


export const recordWithdrawal = async (
  tx: TransactionClient,
  { application, currentStatus }: WithdrawableApplication,
  personId: string,
): Promise<void> => {
  
  
  
  const statusNow = await effectiveStatusBehindLock(tx, application);
  if (!statusNow || NON_WITHDRAWABLE_STATUSES.includes(statusNow)) {
    throw new ConflictError(
      `Cannot withdraw application. Its status is currently "${formatSingleEnumOption(statusNow ?? currentStatus)}".`,
    );
  }

  
  await tx.adoptionApplication.update({
    where: { id: application.id },
    data: { status: ApplicationStatus.WITHDRAWN },
  });

  
  await tx.applicationStatusHistory.create({
    data: {
      applicationId: application.id,
      status: ApplicationStatus.WITHDRAWN,
      statusChangeReason: "Application withdrawn by user.",
      changedById: personId,
    },
  });

  if (statusNow === ApplicationStatus.APPROVED) {
    
    await tx.animal.updateMany({
      where: {
        id: application.animalId,
        listingStatus: AnimalListingStatus.PENDING_ADOPTION,
      },
      data: { listingStatus: AnimalListingStatus.PUBLISHED },
    });
  }
};
