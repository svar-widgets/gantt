export interface IDemoProps {
	skinSettings?: Record<string, any>;
}

export interface IDemoHelpers {
	showNotice: (notice: { text?: string; type?: string }) => void;
}
