import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@formbricks/database";
import { ZOptionalNumber, ZString } from "@formbricks/types/common";
import {
  DatabaseError,
  InvalidInputError,
  ResourceNotFoundError,
  ValidationError,
} from "@formbricks/types/errors";
import {
  TInvite,
  TInviteUpdateInput,
  TInvitee,
  ZInviteUpdateInput,
  ZInvitee,
} from "@formbricks/types/invites";
import { cache } from "../cache";
import { ITEMS_PER_PAGE } from "../constants";
import { getMembershipByUserIdOrganizationId } from "../membership/service";
import { validateInputs } from "../utils/validate";
import { inviteCache } from "./cache";

const inviteSelect: Prisma.InviteSelect = {
  id: true,
  email: true,
  name: true,
  organizationId: true,
  creatorId: true,
  acceptorId: true,
  createdAt: true,
  expiresAt: true,
  role: true,
  teamIds: true,
};
interface InviteWithCreator extends TInvite {
  creator: {
    name: string | null;
    email: string;
  };
}
export const getInvitesByOrganizationId = reactCache(
  async (organizationId: string, page?: number): Promise<TInvite[]> =>
    cache(
      async () => {
        validateInputs([organizationId, ZString], [page, ZOptionalNumber]);

        try {
          const invites = await prisma.invite.findMany({
            where: { organizationId },
            select: inviteSelect,
            take: page ? ITEMS_PER_PAGE : undefined,
            skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
          });

          return invites;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new DatabaseError(error.message);
          }

          throw error;
        }
      },
      [`getInvitesByOrganizationId-${organizationId}-${page}`],
      {
        tags: [inviteCache.tag.byOrganizationId(organizationId)],
      }
    )()
);

export const updateInvite = async (inviteId: string, data: TInviteUpdateInput): Promise<TInvite | null> => {
  validateInputs([inviteId, ZString], [data, ZInviteUpdateInput]);

  try {
    const invite = await prisma.invite.update({
      where: { id: inviteId },
      data,
      select: inviteSelect,
    });

    if (invite === null) {
      throw new ResourceNotFoundError("Invite", inviteId);
    }

    inviteCache.revalidate({
      id: invite.id,
      organizationId: invite.organizationId,
    });

    return invite;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2016") {
      throw new ResourceNotFoundError("Invite", inviteId);
    } else {
      throw error; // Re-throw any other errors
    }
  }
};

export const deleteInvite = async (inviteId: string): Promise<TInvite> => {
  validateInputs([inviteId, ZString]);

  try {
    const invite = await prisma.invite.delete({
      where: {
        id: inviteId,
      },
    });

    if (invite === null) {
      throw new ResourceNotFoundError("Invite", inviteId);
    }

    inviteCache.revalidate({
      id: invite.id,
      organizationId: invite.organizationId,
    });

    return invite;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const getInvite = reactCache(
  async (inviteId: string): Promise<InviteWithCreator | null> =>
    cache(
      async () => {
        validateInputs([inviteId, ZString]);

        try {
          const invite = await prisma.invite.findUnique({
            where: {
              id: inviteId,
            },
            include: {
              creator: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          });

          return invite;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new DatabaseError(error.message);
          }

          throw error;
        }
      },
      [`getInvite-${inviteId}`],
      {
        tags: [inviteCache.tag.byId(inviteId)],
      }
    )()
);

export const resendInvite = async (inviteId: string): Promise<TInvite> => {
  validateInputs([inviteId, ZString]);

  try {
    const invite = await prisma.invite.findUnique({
      where: {
        id: inviteId,
      },
      select: {
        email: true,
        name: true,
        creator: true,
      },
    });

    if (!invite) {
      throw new ResourceNotFoundError("Invite", inviteId);
    }

    const updatedInvite = await prisma.invite.update({
      where: {
        id: inviteId,
      },
      data: {
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    inviteCache.revalidate({
      id: updatedInvite.id,
      organizationId: updatedInvite.organizationId,
    });

    return updatedInvite;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const inviteUser = async ({
  invitee,
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  invitee: TInvitee;
  currentUserId: string;
}): Promise<TInvite> => {
  validateInputs([organizationId, ZString], [invitee, ZInvitee]);

  try {
    const { name, email, role, teamIds } = invitee;

    const existingInvite = await prisma.invite.findFirst({ where: { email, organizationId } });

    if (existingInvite) {
      throw new InvalidInputError("Invite already exists");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const member = await getMembershipByUserIdOrganizationId(user.id, organizationId);

      if (member) {
        throw new InvalidInputError("User is already a member of this organization");
      }
    }

    const teamIdsSet = new Set(teamIds);

    if (teamIdsSet.size !== teamIds.length) {
      throw new ValidationError("teamIds must be unique");
    }

    const teams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        organizationId,
      },
    });

    if (teams.length !== teamIds.length) {
      throw new ValidationError("Invalid teamIds");
    }

    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAt = new Date(Date.now() + expiresIn);

    const invite = await prisma.invite.create({
      data: {
        email,
        name,
        organization: { connect: { id: organizationId } },
        creator: { connect: { id: currentUserId } },
        acceptor: user ? { connect: { id: user.id } } : undefined,
        role,
        expiresAt,
        teamIds: { set: teamIds },
      },
    });

    inviteCache.revalidate({
      id: invite.id,
      organizationId: invite.organizationId,
    });

    return invite;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};
