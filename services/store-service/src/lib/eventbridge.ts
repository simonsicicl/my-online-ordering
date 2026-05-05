import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { config } from './config';

const client = new EventBridgeClient({});

export async function publishEvent(detailType: string, detail: Record<string, unknown>): Promise<void> {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: config.eventBusName,
      Source:       'com.myordering.store',
      DetailType:   detailType,
      Detail:       JSON.stringify(detail),
    }],
  }));
}
