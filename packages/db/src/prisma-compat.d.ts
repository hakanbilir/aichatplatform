/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '@prisma/client' {
  namespace Prisma {
    type JsonPrimitive = string | number | boolean | null;
    type JsonObject = { [key: string]: JsonValue };
    type JsonArray = JsonValue[];
    type JsonValue = JsonPrimitive | JsonObject | JsonArray;
    type InputJsonValue = JsonValue;
    type ConversationWhereInput = Record<string, unknown>;
  }

  export class PrismaClient {
    constructor(options?: unknown);
    [key: string]: any;
    $executeRawUnsafe(query: string): Promise<unknown>;
    $queryRaw(query: TemplateStringsArray): Promise<unknown>;
    $disconnect(): Promise<void>;
  }
}
