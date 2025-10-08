import '@testing-library/jest-dom';
// Polyfill TextEncoder/TextDecoder for libraries that expect them (e.g., react-router)
import { TextEncoder, TextDecoder } from 'util';
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
