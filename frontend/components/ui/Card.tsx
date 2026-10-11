import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "gradient" | "bordered";
  hover?: boolean;
}

export function Card({
  variant = "default",
  hover = false,
  children,
  className,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-white shadow",
    elevated: "bg-white shadow-lg",
    gradient: "bg-gray-50 border border-violet-300/10",
    bordered: "bg-white border border-purple-100",
  };

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        variantStyles[variant],
        hover &&
          "cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 pt-0", className)} {...props}>
      {children}
    </div>
  );
}
