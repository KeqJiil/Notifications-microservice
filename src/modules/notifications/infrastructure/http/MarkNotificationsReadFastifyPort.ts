import { FastifyReply, FastifyRequest } from 'fastify';
import { IMarkNotificationsReadService } from '@modules/notifications/infrastructure/http/MarkNotificationsReadService.interface';
import { IFeedRepository } from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';
import { markAsReadBodySchema } from '@modules/notifications/infrastructure/http/schemas/markAsRead.schema';

export class MarkNotificationsReadFastifyPort implements IMarkNotificationsReadService {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = new UserId(request.user.userId);

    const parsedBody = markAsReadBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new BadRequestException();
    }

    await this.feedRepository.markAsRead(userId, parsedBody.data.ids);

    reply.status(204).send();
  }
}
