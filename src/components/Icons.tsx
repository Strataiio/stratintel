import React from 'react'

const S = (d: string, s = 14) => (
  <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export const IconPlus = () => S('M7 2v10M2 7h10')
export const IconTrash = () => S('M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.5 7.5a.5.5 0 00.5.5h6a.5.5 0 00.5-.5L11 4')
export const IconLink = () => S('M6 8.5a3 3 0 004.243 0l1.414-1.414a3 3 0 00-4.243-4.243L6 4.257M8 5.5a3 3 0 00-4.243 0L2.343 6.914a3 3 0 004.243 4.243L8 9.743')
export const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)
export const IconCheck = () => S('M2 7l4 4 6-7')
export const IconArrow = () => S('M2 7h10M8 3l4 4-4 4')
export const IconBack = () => S('M12 7H2M6 3L2 7l4 4')
export const IconDownload = () => S('M7 2v7M4 6l3 3 3-3M2 11h10')
export const IconSparkle = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1l1.5 3.5L12 6l-3.5 1.5L7 11l-1.5-3.5L2 6l3.5-1.5L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)
export const IconEdit = () => S('M9.5 2.5l2 2L4 12H2v-2l7.5-7.5z')
export const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 3.5V3a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
export const IconResponses = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 6h6M4 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
export const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.4 2.4l1.1 1.1M10.5 10.5l1.1 1.1M11.6 2.4l-1.1 1.1M3.5 10.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
export const IconKey = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="5" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7.5 7h5M10.5 7v1.5M12.5 7v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
export const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
export const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5L2 3.5v4c0 3 2.5 4.5 5 5.5 2.5-1 5-2.5 5-5.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M4.5 7l1.5 1.5L9.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
