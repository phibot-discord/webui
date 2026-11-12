import type { ComponentPropsWithRef, ReactNode } from "react";

export type IconWeight =
	| "thin"
	| "light"
	| "regular"
	| "bold"
	| "fill"
	| "duotone";

export type IconProps = ComponentPropsWithRef<"svg"> & {
	size?: number | string;
	weight?: IconWeight;
};

export type Icon = (props: IconProps) => ReactNode;

export function icon(shapes: Partial<Record<IconWeight, ReactNode>>): Icon {
	// biome-ignore lint/correctness/noComponentHookFactories: icon() runs once per export at module load, never during a render
	return function PhosphorIcon({
		size = "1em",
		weight = "regular",
		children,
		...props
	}: IconProps) {
		return (
			// biome-ignore lint/a11y/noSvgWithoutTitle: callers pass aria-hidden, or role="img" with aria-label
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={size}
				height={size}
				fill="currentColor"
				viewBox="0 0 256 256"
				{...props}
			>
				{children}
				{shapes[weight]}
			</svg>
		);
	};
}
