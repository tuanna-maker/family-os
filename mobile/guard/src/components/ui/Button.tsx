import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  isLoading?: boolean;
}

export function Button({
  variant = 'default',
  size = 'default',
  children,
  isLoading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "flex flex-row items-center justify-center rounded-md";
  const disabledClasses = disabled || isLoading ? "opacity-50" : "";
  
  const variants = {
    default: "bg-primary",
    destructive: "bg-destructive",
    outline: "border border-input bg-background",
    secondary: "bg-secondary",
    ghost: "bg-transparent",
    link: "bg-transparent",
  };
  
  const textVariants = {
    default: "text-primary-foreground",
    destructive: "text-destructive-foreground",
    outline: "text-foreground",
    secondary: "text-secondary-foreground",
    ghost: "text-foreground",
    link: "text-primary underline",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className || ""}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#000' : '#fff'} className="mr-2" />
      ) : null}
      {typeof children === 'string' ? (
        <Text className={`font-medium ${textVariants[variant]}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
