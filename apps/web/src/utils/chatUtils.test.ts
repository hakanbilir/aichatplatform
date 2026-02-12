
// eslint-disable-next-line import/no-unresolved
import { expect, test, describe } from 'bun:test';

import { cleanMessageContent, shouldParseToolOutput } from './chatUtils';

describe('cleanMessageContent', () => {
  test('returns original content if no think tags', () => {
    const input = 'Hello world';
    expect(cleanMessageContent(input)).toBe('Hello world');
  });

  test('removes think tags', () => {
    const input = '<think>some thought</think>Hello world';
    expect(cleanMessageContent(input)).toBe('Hello world');
  });

  test('removes multiline think tags', () => {
    const input = '<think>\nsome\nthought\n</think>Hello world';
    expect(cleanMessageContent(input)).toBe('Hello world');
  });

  test('handles multiple think tags', () => {
    const input = '<think>thought 1</think>Hello <think>thought 2</think>world';
    expect(cleanMessageContent(input)).toBe('Hello world');
  });

  test('does not remove incomplete think tags', () => {
    const input = '<think>thought without end';
    expect(cleanMessageContent(input)).toBe('<think>thought without end');
  });

  test('trims whitespace', () => {
    const input = '   Hello world   ';
    expect(cleanMessageContent(input)).toBe('Hello world');
  });
});

describe('shouldParseToolOutput', () => {
  test('returns true for JSON object string', () => {
    expect(shouldParseToolOutput('{"foo":"bar"}')).toBe(true);
  });

  test('returns true for JSON array string', () => {
    expect(shouldParseToolOutput('[1,2,3]')).toBe(true);
  });

  test('returns false for partial JSON', () => {
    expect(shouldParseToolOutput('{"foo":"bar"')).toBe(false);
  });

  test('returns false for partial array', () => {
    expect(shouldParseToolOutput('[1,2,')).toBe(false);
  });

  test('returns true even with whitespace at end', () => {
      expect(shouldParseToolOutput('{"foo":"bar"}   ')).toBe(true);
  });

  test('returns false for empty string', () => {
      expect(shouldParseToolOutput('')).toBe(false);
  });
});
