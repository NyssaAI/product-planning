#!/usr/bin/env node
import process from 'node:process';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function readJson(text) {
  return JSON.parse(text || '{}');
}

function textBlocksFromContent(content) {
  if (typeof content === 'string') {
    return [content];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text);
}

async function inputField(fieldName) {
  const input = readJson(await readStdin());
  const value = input[fieldName];
  if (value !== undefined && value !== null) {
    process.stdout.write(String(value));
  }
}

async function lastAssistantText() {
  const input = await readStdin();
  let lastText = '';

  for (const line of input.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    const message = entry.message ?? entry;
    const role = message.role ?? entry.role;
    if (role !== 'assistant') continue;

    for (const text of textBlocksFromContent(message.content)) {
      lastText = text;
    }
  }

  process.stdout.write(lastText);
}

function blockOutput(prompt, message) {
  process.stdout.write(
    `${JSON.stringify(
      {
        decision: 'block',
        reason: prompt,
        systemMessage: message,
      },
      null,
      2,
    )}\n`,
  );
}

const command = process.argv[2];

try {
  if (command === 'input-field') {
    await inputField(process.argv[3]);
  } else if (command === 'last-assistant-text') {
    await lastAssistantText();
  } else if (command === 'block-output') {
    blockOutput(process.argv[3] ?? '', process.argv[4] ?? '');
  } else {
    console.error('Usage: stop-hook-json.mjs input-field <name> | last-assistant-text | block-output <prompt> <message>');
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
