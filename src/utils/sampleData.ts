import { Attachment } from '../types/index.ts';

// Minimal valid PDF with text "NovaMind Enterprise AI Platform Q3 2026 Financial & Systems Audit Report"
const SAMPLE_PDF_BASE64 =
  'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iamoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iamozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSID4+ID4+ID4+CmVuZG9iamo0IDAgb2JqCjw8IC9MZW5ndGggMTg0ID4+CnN0cmVhbQpCVAovRjEgMTggVGYKNTAgNzAwIFRkCihOb3ZhTWluZCBJbmRlcGVuZGVudCBJbnRlbGxpZ2VuY2UgUGxhdGZvcm0gLSBRMyAyMDI2IEF1ZGl0KSBUagowIC0zMCBUZAovRjEgMTIgVGYKKEFubnVhbCBHcm93dGg6IDM0MiUgfCBBdmVyYWdlIExhdGVuY3k6IDI5MG1zIHwgVG9rZW4gVGhyb3VnaHB1dDogMTRNIFRva2Vucy9kYXkpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAwMDAwMDI1NSAwMDAwMCBuIAowMDAwMDAwNDkyIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNTcyCiUlRU9GCg==';

// Sample 256x256 test PNG image (data visualization showing an AI neural diagram)
const SAMPLE_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAdElEQVR42u3PMQEAAAgEIPu/tC8cDA5QoMmaOgoEAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECPzWArwDBCPZ0XhHAAAAAElFTkSuQmCC';

const SAMPLE_CSV = `Month,Enterprise_Customers,ARR_Millions,Active_Agents,Avg_Latency_ms
2026-01,120,4.2,850,310
2026-02,185,6.5,1420,295
2026-03,240,8.9,2100,280
2026-04,310,11.4,2950,270
2026-05,420,15.8,4200,265
2026-06,560,21.2,5800,250
2026-07,690,26.5,7400,240
2026-08,830,32.0,9100,235
2026-09,980,38.5,11200,225
2026-10,1150,45.8,13800,215`;

const SAMPLE_RESEARCH_DOC = `# Research Memo: Next-Generation Solid-State Electrolytes (2026 Evaluation)

## Executive Summary
Solid-state lithium-metal batteries (SSBs) utilizing sulfide-based composite ceramic electrolytes have achieved commercial volumetric energy densities exceeding 520 Wh/kg in 2026 pilot deployments.

## Core Breakthroughs
1. Sulfide-Halide Hybrid Interfaces: Eliminates dendrite propagation across 1,200 fast-charge cycles (10-80% in 12 minutes).
2. Cold Isostatic Roll-to-Roll Bonding: Reduced manufacturing interface pressure requirements from 50 MPa to 2.5 MPa, enabling standard gigafactory retrofitting.
3. Thermal Stability: Operates without runaway degradation up to 180°C.

## Remaining Engineering Challenges
- Interfacial resistance degradation under sub-zero operating environments (-20°C).
- Cost scaling of precursor lithium sulfide (Li2S) synthesized from sustainable brine sources.`;

export const PRESET_SAMPLE_FILES: Array<{
  name: string;
  description: string;
  attachment: Attachment;
  suggestedPrompt: string;
  suggestedMode: 'research' | 'coding' | 'thinking' | 'agent';
}> = [
  {
    name: 'NovaMind_Q3_2026_Audit.pdf',
    description: 'PDF Document: System latency and token throughput audit',
    attachment: {
      id: 'sample_pdf_1',
      name: 'NovaMind_Q3_2026_Audit.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      dataBase64: SAMPLE_PDF_BASE64,
    },
    suggestedPrompt: 'Analyze this attached PDF document: extract the annual growth rate, average latency, and daily token throughput, and explain what each metric signifies.',
    suggestedMode: 'thinking',
  },
  {
    name: 'Enterprise_Metrics_2026.csv',
    description: 'Tabular Data: 10-month ARR and Active Agent trends',
    attachment: {
      id: 'sample_csv_1',
      name: 'Enterprise_Metrics_2026.csv',
      mimeType: 'text/csv',
      size: 420,
      extractedText: SAMPLE_CSV,
    },
    suggestedPrompt: 'Analyze this attached spreadsheet: calculate the month-over-month growth rate in ARR from January to October 2026, and summarize the key inflection points.',
    suggestedMode: 'agent',
  },
  {
    name: 'Solid_State_Electrolytes_2026.txt',
    description: 'Research Document: Volumetric density and sulfide interfaces',
    attachment: {
      id: 'sample_txt_1',
      name: 'Solid_State_Electrolytes_2026.txt',
      mimeType: 'text/plain',
      size: 890,
      extractedText: SAMPLE_RESEARCH_DOC,
    },
    suggestedPrompt: 'Perform semantic document extraction on this research paper: list the three core technical breakthroughs in solid-state electrolytes and the remaining challenges.',
    suggestedMode: 'thinking',
  },
  {
    name: 'Neural_Architecture.png',
    description: 'Image: Multimodal diagram for visual inspection',
    attachment: {
      id: 'sample_img_1',
      name: 'Neural_Architecture.png',
      mimeType: 'image/png',
      size: 512,
      dataBase64: SAMPLE_IMAGE_BASE64,
    },
    suggestedPrompt: 'Inspect this uploaded image. Describe its dimensions, visual structure, and explain how a multimodal AI model processes image patches.',
    suggestedMode: 'thinking',
  },
];
