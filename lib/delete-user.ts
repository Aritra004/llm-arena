import prisma from "./prisma";

export async function deleteUser(userId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.responseAttempt.updateMany({
      where: {
        comparison: { ownerId: userId },
      },
      data: {
        responseCiphertext: null,
        responseKeyVersion: null,
      },
    });

    await transaction.comparison.updateMany({
      where: { ownerId: userId },
      data: {
        promptCiphertext: null,
        promptKeyVersion: null,
        contentDeletedAt: new Date(),
        ownerId: null,
      },
    });

    return transaction.user.delete({
      where: { id: userId },
    });
  });
}
