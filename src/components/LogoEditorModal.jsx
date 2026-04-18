import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOGO_EDITOR_FRAME = { width: 360, height: 180 };
const LOGO_OUTPUT_SIZE = { width: 1200, height: 600 };

const clampOffset = (offset, displaySize, frameSize) => {
    const maxShift = Math.max(0, (displaySize - frameSize) / 2);
    return Math.min(maxShift, Math.max(-maxShift, offset));
};

const drawEditedLogo = (ctx, image, zoom, offset, frameSize, outputSize) => {
    const baseScale = Math.min(outputSize.width / image.naturalWidth, outputSize.height / image.naturalHeight);
    const drawWidth = image.naturalWidth * baseScale * zoom;
    const drawHeight = image.naturalHeight * baseScale * zoom;
    const scaleRatioX = outputSize.width / frameSize.width;
    const scaleRatioY = outputSize.height / frameSize.height;
    const drawX = outputSize.width / 2 + offset.x * scaleRatioX - drawWidth / 2;
    const drawY = outputSize.height / 2 + offset.y * scaleRatioY - drawHeight / 2;

    ctx.clearRect(0, 0, outputSize.width, outputSize.height);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
};

const blobFromCanvas = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export edited logo.'));
    }, 'image/png');
});

const LogoEditorModal = ({
    isOpen,
    file,
    slotLabel = 'Logo',
    onCancel,
    onConfirm
}) => {
    const dragStateRef = useRef(null);
    const [imageUrl, setImageUrl] = useState('');
    const [imageElement, setImageElement] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        if (!isOpen || !file) {
            setImageUrl('');
            setImageElement(null);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setPreviewUrl('');
            return undefined;
        }

        const nextUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            setImageElement(image);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        };
        image.onerror = () => {
            setImageElement(null);
        };
        image.src = nextUrl;
        setImageUrl(nextUrl);

        return () => {
            URL.revokeObjectURL(nextUrl);
        };
    }, [file, isOpen]);

    const displayMetrics = useMemo(() => {
        if (!imageElement) {
            return { width: 0, height: 0 };
        }

        const baseScale = Math.min(
            LOGO_EDITOR_FRAME.width / imageElement.naturalWidth,
            LOGO_EDITOR_FRAME.height / imageElement.naturalHeight
        );

        return {
            width: imageElement.naturalWidth * baseScale * zoom,
            height: imageElement.naturalHeight * baseScale * zoom
        };
    }, [imageElement, zoom]);

    const updateOffsetWithinBounds = useCallback((nextOffset) => {
        setOffset({
            x: clampOffset(nextOffset.x, displayMetrics.width, LOGO_EDITOR_FRAME.width),
            y: clampOffset(nextOffset.y, displayMetrics.height, LOGO_EDITOR_FRAME.height)
        });
    }, [displayMetrics.height, displayMetrics.width]);

    useEffect(() => {
        setOffset((currentOffset) => {
            const boundedOffset = {
                x: clampOffset(currentOffset.x, displayMetrics.width, LOGO_EDITOR_FRAME.width),
                y: clampOffset(currentOffset.y, displayMetrics.height, LOGO_EDITOR_FRAME.height)
            };

            if (boundedOffset.x === currentOffset.x && boundedOffset.y === currentOffset.y) {
                return currentOffset;
            }

            return boundedOffset;
        });
    }, [displayMetrics.width, displayMetrics.height]);

    useEffect(() => {
        if (!imageElement) {
            setPreviewUrl('');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = LOGO_OUTPUT_SIZE.width;
        canvas.height = LOGO_OUTPUT_SIZE.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawEditedLogo(ctx, imageElement, zoom, offset, LOGO_EDITOR_FRAME, LOGO_OUTPUT_SIZE);
        setPreviewUrl(canvas.toDataURL('image/png'));
    }, [imageElement, offset, zoom]);

    useEffect(() => {
        if (!isDragging) return undefined;

        const handlePointerMove = (event) => {
            if (!dragStateRef.current) return;

            const nextOffset = {
                x: dragStateRef.current.originX + (event.clientX - dragStateRef.current.startX),
                y: dragStateRef.current.originY + (event.clientY - dragStateRef.current.startY)
            };
            updateOffsetWithinBounds(nextOffset);
        };

        const handlePointerUp = () => {
            dragStateRef.current = null;
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [displayMetrics.height, displayMetrics.width, isDragging, updateOffsetWithinBounds]);

    if (!isOpen) return null;

    const handleZoomChange = (event) => {
        const nextZoom = Number(event.target.value);
        setZoom(nextZoom);
    };

    const handlePointerDown = (event) => {
        if (!imageElement) return;
        dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: offset.x,
            originY: offset.y
        };
        setIsDragging(true);
    };

    const handleReset = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    const handleSave = async () => {
        if (!imageElement || isSaving) return;

        setIsSaving(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = LOGO_OUTPUT_SIZE.width;
            canvas.height = LOGO_OUTPUT_SIZE.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Unable to prepare logo export.');
            }

            drawEditedLogo(ctx, imageElement, zoom, offset, LOGO_EDITOR_FRAME, LOGO_OUTPUT_SIZE);
            const blob = await blobFromCanvas(canvas);
            await onConfirm(blob);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content msd-logo-editor-modal" onClick={(event) => event.stopPropagation()}>
                <h3 className="msd-logo-editor-title">Edit {slotLabel}</h3>
                <p className="msd-logo-editor-subtitle">
                    Drag to reposition and use zoom to crop or fit the logo inside a fixed frame. Final upload stays a consistent size.
                </p>

                <div className="msd-logo-editor-grid">
                    <div className="msd-logo-editor-panel">
                        <div className="msd-logo-editor-panel-label">Editor</div>
                        <div
                            className={`msd-logo-editor-stage${isDragging ? ' is-dragging' : ''}`}
                            onPointerDown={handlePointerDown}
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={`${slotLabel} editor`}
                                    className="msd-logo-editor-image"
                                    draggable={false}
                                    style={{
                                        width: `${displayMetrics.width}px`,
                                        height: `${displayMetrics.height}px`,
                                        left: `calc(50% + ${offset.x}px)`,
                                        top: `calc(50% + ${offset.y}px)`
                                    }}
                                />
                            ) : (
                                <div className="msd-logo-editor-empty">Unable to load this image.</div>
                            )}
                        </div>

                        <div className="msd-logo-editor-controls">
                            <label className="msd-logo-editor-zoom-label">
                                Zoom
                                <input
                                    type="range"
                                    min="1"
                                    max="4"
                                    step="0.01"
                                    value={zoom}
                                    onChange={handleZoomChange}
                                />
                                <span>{zoom.toFixed(2)}x</span>
                            </label>
                            <button type="button" className="msd-modal-cancel-btn" onClick={handleReset}>
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="msd-logo-editor-panel">
                        <div className="msd-logo-editor-panel-label">Output Preview</div>
                        <div className="msd-logo-editor-preview-shell">
                            {previewUrl ? (
                                <img src={previewUrl} alt={`${slotLabel} output preview`} className="msd-logo-editor-preview" />
                            ) : (
                                <div className="msd-logo-editor-empty">Preview unavailable.</div>
                            )}
                        </div>
                        <div className="msd-logo-editor-meta">
                            Final PNG size: {LOGO_OUTPUT_SIZE.width} x {LOGO_OUTPUT_SIZE.height}
                        </div>
                    </div>
                </div>

                <div className="msd-create-actions">
                    <button type="button" onClick={onCancel} className="msd-modal-cancel-btn" disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="msd-modal-create-btn" disabled={!imageElement || isSaving}>
                        {isSaving ? 'Saving...' : 'Use This Logo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoEditorModal;
