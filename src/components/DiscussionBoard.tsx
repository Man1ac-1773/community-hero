'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

interface Comment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  content: string;
  created_at: string;
}

export default function DiscussionBoard({ reportId, user }: { reportId: string, user: any }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    async function loadComments() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('reportId', reportId)
        .order('created_at', { ascending: true });
      if (data) setComments(data as Comment[]);
      setLoading(false);
    }
    loadComments();
  }, [reportId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("PLEASE LOGIN TO COMMENT.", 'warning');
      return;
    }
    if (!newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          reportId,
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Citizen',
          content: newComment.trim()
        }])
        .select();
      
      if (error) throw error;
      if (data) setComments([...comments, data[0] as Comment]);
      setNewComment('');
    } catch (err: any) {
      showToast("Failed to post comment: " + err.message, 'error');
    }
  };

  return (
    <div className="brutalist-panel" style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--border-color)', padding: '1.5rem', backgroundColor: '#FFEA00' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>CIVIC DISCUSSION</h2>
      </div>
      
      <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          {loading ? (
            <p style={{ fontWeight: 800 }}>LOADING...</p>
          ) : comments.length === 0 ? (
            <p style={{ color: '#888', fontWeight: 600 }}>NO COMMENTS YET. BE THE FIRST TO WEIGH IN.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ padding: '1rem', border: '2px solid var(--border-color)', backgroundColor: c.userId === user?.id ? 'var(--text-color)' : 'white', color: c.userId === user?.id ? 'white' : 'black' }}>
                <strong style={{ display: 'block', color: c.userId === user?.id ? 'var(--primary-color)' : 'var(--primary-color)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{c.userName.toUpperCase()}</strong>
                <p style={{ margin: 0, fontWeight: 500 }}>{c.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', padding: '1.5rem', borderTop: '4px solid var(--border-color)', backgroundColor: 'white' }}>
          <input 
            type="text" 
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="ADD YOUR THOUGHTS..."
            style={{ flexGrow: 1, padding: '1rem', border: '2px solid var(--border-color)', fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>POST</button>
        </form>
    </div>
  );
}
