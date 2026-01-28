import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrderChat, OrderMessage } from '@/hooks/useOrderChat';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface OrderChatDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole: 'student' | 'shopkeeper';
  customerName?: string | null;
  shopName?: string | null;
}

const OrderChatDialog = ({
  orderId,
  open,
  onOpenChange,
  currentUserRole,
  customerName,
  shopName,
}: OrderChatDialogProps) => {
  const { messages, isLoading, sendMessage } = useOrderChat(orderId);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    const ok = await sendMessage(newMessage, currentUserRole);
    if (ok) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderName = (msg: OrderMessage) => {
    if (msg.sender_role === 'student') {
      return customerName || 'Customer';
    }
    return shopName || 'Shop';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Chat - Order #{orderId?.slice(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages.map((msg) => {
                const isMe = msg.sender_role === currentUserRole;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex flex-col max-w-[80%]', isMe ? 'ml-auto items-end' : 'items-start')}
                  >
                    <span className="text-xs text-muted-foreground mb-1">
                      {getSenderName(msg)}
                    </span>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm',
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      )}
                    >
                      {msg.message}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            maxLength={500}
          />
          <Button onClick={handleSend} disabled={isSending || !newMessage.trim()} size="icon">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderChatDialog;
