
import React from 'react';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({ value, onValueChange, min, max, step, className }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(event.target.value));
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleChange}
      className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer 
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
        [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0
        ${className}`}
    />
  );
};
