import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <View className="flex flex-col gap-1.5 w-full">
        {label && <Text className="text-sm font-medium text-foreground">{label}</Text>}
        <TextInput
          ref={ref}
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:border-ring ${
            error ? 'border-destructive' : ''
          } ${className || ""}`}
          placeholderTextColor="#6b7280"
          {...props}
        />
        {error && <Text className="text-[13px] text-destructive">{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
