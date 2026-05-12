import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  style?: CSSProperties
  className?: string
}

export function IconSearch({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.16699 2.375C12.9178 2.37518 15.958 5.41617 15.958 9.16699C15.9579 10.7718 15.3993 12.2462 14.4688 13.4082L17.1973 16.1367C17.4898 16.4296 17.4901 16.9045 17.1973 17.1973C16.9045 17.4901 16.4296 17.4898 16.1367 17.1973L13.4082 14.4688C12.2462 15.3993 10.7718 15.9579 9.16699 15.958C5.41617 15.958 2.37518 12.9178 2.375 9.16699C2.375 5.41606 5.41606 2.375 9.16699 2.375ZM9.16699 3.875C6.24449 3.875 3.875 6.24449 3.875 9.16699C3.87518 12.0894 6.24459 14.458 9.16699 14.458C10.6283 14.4579 11.9498 13.8666 12.9082 12.9082C13.8666 11.9498 14.4579 10.6283 14.458 9.16699C14.458 6.24459 12.0894 3.87518 9.16699 3.875Z" fill="currentColor"/>
    </svg>
  )
}

export function IconXMark({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M14.2611 4.67809C14.5539 4.3853 15.0287 4.38552 15.3216 4.67809C15.6145 4.97098 15.6145 5.44574 15.3216 5.73863L11.0599 9.99938L15.3216 14.2611C15.6145 14.554 15.6145 15.0287 15.3216 15.3216C15.0287 15.6145 14.554 15.6145 14.2611 15.3216L9.99938 11.0599L5.73863 15.3216C5.44574 15.6145 4.97098 15.6145 4.67809 15.3216C4.38552 15.0287 4.3853 14.5539 4.67809 14.2611L8.93883 9.99938L4.67809 5.73863C4.38535 5.44573 4.38525 4.97093 4.67809 4.67809C4.97093 4.38525 5.44573 4.38535 5.73863 4.67809L9.99938 8.93883L14.2611 4.67809Z" fill="currentColor"/>
    </svg>
  )
}

export function IconReset({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M10.4164 2.375C13.9372 2.375 16.7914 5.22918 16.7914 8.75V9.16699C16.7912 12.4574 14.1238 15.1248 10.8334 15.125C10.4192 15.1249 10.0834 14.7891 10.0834 14.375C10.0834 13.9609 10.4192 13.6251 10.8334 13.625C13.2954 13.6248 15.2912 11.629 15.2914 9.16699V8.75C15.2914 6.05761 13.1087 3.875 10.4164 3.875C7.72408 3.87512 5.54137 6.05769 5.54137 8.75V15.0645L7.38609 13.2197C7.67897 12.9269 8.15374 12.9269 8.44664 13.2197C8.73953 13.5126 8.73953 13.9874 8.44664 14.2803L5.32164 17.4053C5.02874 17.6981 4.55395 17.6981 4.26109 17.4053L1.13609 14.2803C0.843288 13.9874 0.843326 13.5126 1.13609 13.2197C1.42897 12.9269 1.90374 12.9269 2.19664 13.2197L4.04137 15.0645V8.75C4.04137 5.22926 6.89565 2.37512 10.4164 2.375Z" fill="currentColor"/>
    </svg>
  )
}

export function IconChevronDown({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M12.8031 7.80309C13.0959 7.51041 13.5708 7.51041 13.8636 7.80309C14.1563 8.09594 14.1563 8.57078 13.8636 8.86363L11.4144 11.3129C10.6334 12.0939 9.36637 12.0939 8.58531 11.3129L6.13609 8.86363C5.84336 8.57073 5.84325 8.09593 6.13609 7.80309C6.42893 7.51025 6.90373 7.51035 7.19664 7.80309L9.64586 10.2523C9.84109 10.4475 10.1576 10.4475 10.3529 10.2523L12.8031 7.80309Z" fill="currentColor"/>
    </svg>
  )
}

export function IconChevronLeft({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M11.5531 4.26207C11.8459 3.96923 12.3207 3.96934 12.6136 4.26207C12.9062 4.55498 12.9064 5.02981 12.6136 5.32262L7.93492 10.0003L12.6136 14.6791C12.9062 14.972 12.9064 15.4468 12.6136 15.7396C12.3208 16.0321 11.8459 16.0321 11.5531 15.7396L6.34508 10.5306C6.05235 10.2377 6.05224 9.76292 6.34508 9.47008L11.5531 4.26207Z" fill="currentColor"/>
    </svg>
  )
}

export function IconChevronUp({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M8.58632 8.68679C9.36739 7.90589 10.6344 7.90578 11.4154 8.68679L13.8646 11.136C14.1572 11.4288 14.1571 11.9037 13.8646 12.1966C13.5718 12.4894 13.097 12.4893 12.8041 12.1966L10.3539 9.74734C10.1587 9.5523 9.84209 9.55228 9.64686 9.74734L7.19764 12.1966C6.9048 12.4894 6.43001 12.4893 6.1371 12.1966C5.84431 11.9037 5.84424 11.4289 6.1371 11.136L8.58632 8.68679Z" fill="currentColor"/>
    </svg>
  )
}

export function IconAlignLeft({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M16.25 12.0833H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.25 3.75H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.30556 16.25H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.30556 7.91669H3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconAlignCenter({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M7.22266 16.25H12.7782" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3.75 12.0833H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7.22266 7.91669H12.7782" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3.75 3.75H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconAlignRight({ size = 20, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} className={className}>
      <path d="M3.75 12.0833H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.75 3.75H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.6943 16.25H16.2499" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.6943 7.91669H16.2499" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
