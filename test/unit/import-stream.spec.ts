import { describe, expect, it } from 'vitest';
import { formatElapsedTime, parseImportStreamEvent, splitNdjsonLines } from '../../app/utils/import-stream';

describe('splitNdjsonLines', () => {
	it('keeps a partial trailing line for the next chunk', () => {
		expect(splitNdjsonLines('{"type":"progress"}\n{"type":"pro')).toEqual({
			lines: ['{"type":"progress"}'],
			rest: '{"type":"pro',
		});
	});

	it('drops blank and carriage-return padding between events', () => {
		expect(splitNdjsonLines('{"a":1}\r\n\n{"b":2}\n')).toEqual({
			lines: ['{"a":1}', '{"b":2}'],
			rest: '',
		});
	});
});

describe('parseImportStreamEvent', () => {
	it('reads Import Progress with a known total', () => {
		expect(parseImportStreamEvent('{"type":"progress","processed":12,"total":40}')).toEqual({
			type: 'progress',
			processed: 12,
			total: 40,
		});
	});

	it('keeps an uncounted total unknown instead of guessing zero', () => {
		expect(parseImportStreamEvent('{"type":"progress","processed":3,"total":null}')).toEqual({
			type: 'progress',
			processed: 3,
			total: null,
		});
	});

	it('reads a result from a nested payload and from inline fields', () => {
		expect(parseImportStreamEvent('{"type":"result","result":{"created":2}}')).toEqual({
			type: 'result',
			result: { created: 2 },
		});
		expect(parseImportStreamEvent('{"type":"result","created":2}')).toEqual({
			type: 'result',
			result: { type: 'result', created: 2 },
		});
	});

	it('reads a stopped event with its partial counts', () => {
		expect(
			parseImportStreamEvent(
				'{"type":"stopped","processed":5,"total":40,"result":{"created":4,"updated":1,"failed":0,"total":40,"errors":[],"images_attached":0,"image_warnings":[]}}',
			),
		).toEqual({
			type: 'stopped',
			processed: 5,
			total: 40,
			result: {
				created: 4,
				updated: 1,
				failed: 0,
				total: 40,
				errors: [],
				images_attached: 0,
				image_warnings: [],
			},
		});
	});

	it('reads an error event and falls back to a generic message', () => {
		expect(parseImportStreamEvent('{"type":"error","message":"Row 4 is invalid"}')).toEqual({
			type: 'error',
			message: 'Row 4 is invalid',
		});
		expect(parseImportStreamEvent('{"type":"error"}')).toEqual({
			type: 'error',
			message: 'Import failed',
		});
	});

	it('ignores blank, malformed, and unknown lines', () => {
		expect(parseImportStreamEvent('   ')).toBeUndefined();
		expect(parseImportStreamEvent('{"type":"progress"')).toBeUndefined();
		expect(parseImportStreamEvent('{"type":"heartbeat"}')).toBeUndefined();
	});
});

describe('formatElapsedTime', () => {
	it('shows seconds below a minute and mm:ss above it', () => {
		expect(formatElapsedTime(0)).toBe('0s');
		expect(formatElapsedTime(59)).toBe('59s');
		expect(formatElapsedTime(60)).toBe('1:00');
		expect(formatElapsedTime(125)).toBe('2:05');
	});

	it('treats negative and non-finite input as no elapsed time', () => {
		expect(formatElapsedTime(-5)).toBe('0s');
		expect(formatElapsedTime(Number.NaN)).toBe('0s');
	});
});
