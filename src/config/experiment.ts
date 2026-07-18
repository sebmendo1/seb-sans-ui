import type { Experiment } from '../types'

export const ACTIVE_EXPERIMENT: Experiment = {
  id: 1,
  version: 'survey-001',
  status: 'active',
  displayDefaults: {
    size: 36,
    weight: 660,
    opsz: 30,
    tracking: -0.015,
    leading: 1.1,
    xheight: 100,
  },
  bodyDefaults: {
    size: 18,
    weight: 430,
    opsz: 14,
    tracking: 0,
    leading: 1.55,
    xheight: 100,
  },
  displaySample: 'The lamp that would not argue',
  bodySample:
    'The surveyor arrived in spring with instruments nobody recognized, and measured ' +
    'the village for a map nobody had asked for. Streets: 14. Wells: 3. Doors painted ' +
    'blue: 27. She wrote each number in a small canvas book, and the numbers lined up ' +
    'like fence posts.\n\n' +
    '“Why count what we already know?” asked the innkeeper, watching her chart the square.\n\n' +
    '“Because you know it differently than it is,” she said. “You remember 40 blue doors. ' +
    'There are 27. The map holds what the memory rounds.”',
  font: {
    version: 'Seb Sans v0.5.1',
    url: '/fonts/survey/v0.5.1/SebSansVar.woff2',
    sha256: '7a9ee8556c97076547457fb800662fa92611e038299a67420df0092053525525',
    axes: {
      wght: { min: 100, default: 400, max: 900 },
      opsz: { min: 14, default: 14, max: 32 },
      XHGT: { min: 82, default: 100, max: 122 },
    },
  },
  createdAt: '2026-01-01T00:00:00.000Z',
}
