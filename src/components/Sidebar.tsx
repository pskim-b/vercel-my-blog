export default function Sidebar() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-bold">Kim Pyeong Seok</h2>
        <p className="text-gray-400">The engineer of *</p>
        <p className="text-sm text-gray-500 mt-2">{currentDate}</p>
      </div>
    </div>
  );
}
