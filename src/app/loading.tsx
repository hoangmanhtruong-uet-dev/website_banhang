export default function Loading() {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:'16px',
    }}>
      <div style={{
        width:'48px', height:'48px', border:'3px solid var(--border)',
        borderTopColor:'var(--accent)', borderRadius:'50%',
        animation:'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize:'14px', color:'var(--text-muted)' }}>Đang tải...</p>
    </div>
  );
}