import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  // Clear auth cookie
  response.cookies.delete('auth-token');
  
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  // Clear auth cookie
  response.cookies.delete('auth-token');
  
  return response;
}
