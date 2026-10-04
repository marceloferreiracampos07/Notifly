import { Processor, WorkerHost } from "@nestjs/bullmq";
import { QUEUE_CONSTANTS } from "./queue.constants.js";
import { Job } from "bullmq";

@Processor(QUEUE_CONSTANTS.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    const data = job.data;

    console.log(`[Worker] Processando job ${job.id}...`, data);

    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true };
  }
}