import { Tool } from '@synaptic-ai/toolmaker';
import { getTime } from './capabilities/time';

const clock = new Tool({
  name: 'Clock',
  description: 'Tool for getting current date and time information',
  capabilities: [getTime]
});

export default clock; 