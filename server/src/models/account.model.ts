import { prisma } from "../config/prisma.js";
import type { AuthProvider } from "../generated/prisma/enums.js";
import type { User } from "../generated/prisma/client.js";

export interface OAuthProfileInput {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Resolves an OAuth profile to a user, creating one if needed. Matching on
 * email first lets a person sign in with Google and GitHub and land on the
 * same account, with a linked `Account` row per provider.
 */
export async function findOrCreateUserFromOAuth(
  input: OAuthProfileInput,
): Promise<User> {
  const { provider, providerAccountId, email, name, avatarUrl } = input;

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });

  if (existingAccount) {
    return prisma.user.update({
      where: { id: existingAccount.userId },
      data: { name, avatarUrl: avatarUrl ?? existingAccount.user.avatarUrl },
    });
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name, avatarUrl: avatarUrl ?? null },
      update: { name, avatarUrl: avatarUrl ?? undefined },
    });

    await tx.account.create({
      data: { provider, providerAccountId, userId: user.id },
    });

    return user;
  });
}

export function listAccountsForUser(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    select: { id: true, provider: true, createdAt: true },
  });
}
