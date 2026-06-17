import {
  KAFKA_REVIEW_TOPIC,
  KAFKA_REVIEW_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startReviewKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_REVIEW_TOPIC,
    groupId: KAFKA_REVIEW_GROUP_ID,
    dispatcher,
  });
}
