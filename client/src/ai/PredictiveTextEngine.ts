// 2026 Client-Side Predictive Typing & Smart Compose Engine
// Zero network requests, 100% on-device local execution

const COMMON_PREDICTIONS: Record<string, string[]> = {
  // Greetings & check-ins
  'h': ['ey there, how are you?', 'ello everyone!', 'ow is the connection?'],
  'he': ['llo, can you hear me clearly?', 'y, let me know if audio is good.'],
  'g': ['ood morning everyone.', 'reat, the connection is solid!'],
  'gr': ['eat, let me share my screen now.', 'eat to connect with you!'],

  // WebRTC & technical discussions
  'c': ['an you hear and see me clearly?', 'hecking the WebRTC data channel right now.'],
  'ca': ['n you hear me properly?', 'n you see the shared screen?'],
  'w': ['e are connected via direct peer-to-peer.', 'ould you like me to send the file?'],
  'we': ['bRTC direct stream is working smoothly.', ' can test the P2P file transfer now.'],
  's': ['ounds like a plan!', 'ending the file over the encrypted data channel.'],
  'so': ['unds great, let us proceed.', 'unds good to me!'],
  'l': ['et me know when you receive the packet.', 'et us wrap up the meeting notes.'],
  'le': ['t me share the document with you.', 't me check the network latency.'],

  // Meeting & workflow phrases
  'i': [' will take care of this action item.', ' will follow up by tomorrow.', ' agree with this point.'],
  'i w': ['ill send the updated code shortly.', 'ill review the PR today.'],
  't': ['hanks for joining the call!', 'he end-to-end encryption is active.'],
  'th': ['ank you for the update!', 'e data transfer is completed.'],
  'p': ['lease check the shared document.', '2P connection is verified and secure.'],
  'pl': ['ease confirm if you received the message.', 'ease share your feedback.'],
  'm': ['eeting notes have been saved.', 'y audio is working properly.'],
  'd': ['one with the assigned task.', 'oes anyone have questions?'],
};

export class PredictiveTextEngine {
  /**
   * Returns an inline ghost completion string for the current input.
   */
  public static getInlinePrediction(input: string): string {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > 40) return '';

    const lower = trimmed.toLowerCase();

    // Look for exact prefix match
    for (const [prefix, options] of Object.entries(COMMON_PREDICTIONS)) {
      if (lower.startsWith(prefix) && prefix.length <= lower.length) {
        for (const option of options) {
          const fullCandidate = prefix + option.slice(prefix.length);
          if (fullCandidate.toLowerCase().startsWith(lower) && fullCandidate.length > lower.length) {
            // Return only the remaining suffix to complete the sentence
            return fullCandidate.slice(trimmed.length);
          }
        }
      }
    }

    // Default word predictions
    if (lower === 'y') return 'es, that works perfectly.';
    if (lower === 'n') return 'o problem, let me know.';
    if (lower === 'ok') return ', let us move to the next item.';

    return '';
  }

  /**
   * Generates dynamic contextual quick reply chips based on the last message received.
   */
  public static getContextualChips(lastMessage?: string): string[] {
    if (!lastMessage) {
      return ['Sounds good! 👍', 'Let us connect on video', 'I will send the file', 'Clear & loud 🎙️'];
    }

    const lower = lastMessage.toLowerCase();

    if (lower.includes('?') || lower.includes('hear') || lower.includes('see')) {
      return ['Yes, crystal clear! 🔊', 'Video is working great', 'Wait, checking my mic', 'Can you hear me?'];
    }

    if (lower.includes('file') || lower.includes('send') || lower.includes('attachment')) {
      return ['Received the file! 📎', 'Downloading via P2P...', 'File integrity verified ✓', 'Could you resend?'];
    }

    if (lower.includes('bye') || lower.includes('leave') || lower.includes('wrap up') || lower.includes('end')) {
      return ['Thanks everyone! 👋', 'Have a great day', 'Meeting notes saved ✓', 'See you next time'];
    }

    return ['Understood 👍', 'Working on it now', 'Let me check that', 'Agreed, let us proceed'];
  }
}
