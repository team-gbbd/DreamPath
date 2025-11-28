'use client';

import { useState } from 'react';
import ChatPage from '@/components/career/ChatPage';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  return <ChatPage sessionId={sessionId} setSessionId={setSessionId} />;
}

