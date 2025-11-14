
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  className = '',
  disabled = false 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:shadow-lg hover:scale-105',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    outline: 'border-2 border-transparent bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-border text-transparent hover:text-white hover:bg-clip-padding'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}
