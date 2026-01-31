
import { ToolDefinition } from './types';
import { z } from 'zod';

const generateUiSchema = z.object({
  title: z.string().describe('The title of the artifact or UI component'),
  type: z.enum(['html', 'svg']).describe('The type of artifact. Use "html" for interactive widgets, dashboards, or games (rendered in iframe). Use "svg" for vector graphics.'),
  code: z.string().describe('The complete code for the artifact. For HTML, include full HTML/CSS/JS in a single string.'),
});

export const generateUiTool: ToolDefinition<z.infer<typeof generateUiSchema>> = {
  name: 'generate_ui',
  description: 'Generates an interactive UI artifact (HTML or SVG). Use this when the user asks to visualize data, create a game, build a dashboard, or design a component.',
  argsSchema: generateUiSchema,
  execute: async (args) => {
    // The execution is minimal because the real work is done by the frontend rendering the artifact.
    // The backend just confirms it "generated" it.
    return {
      status: 'generated',
      title: args.title,
      type: args.type,
      code: args.code, // Return code so frontend can render it from tool result
      length: args.code.length
    };
  },
};
