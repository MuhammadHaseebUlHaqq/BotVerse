export default function LoadingSpinner({ size = "medium", text = "Loading..." }) {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-8 w-8", 
    large: "h-12 w-12"
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full border-4 border-red-600 border-t-transparent ${sizeClasses[size]} mb-2`}></div>
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );
} 