interface JQueryConfirmButtonOptions {
    text?: string;
    btnClass?: string;
    keys?: string[];
    isHidden?: boolean;
    isDisabled?: boolean;
    action?: (button: unknown) => unknown;
}

type JQueryConfirmButton = JQueryConfirmButtonOptions | ((button: unknown) => unknown);

type JQueryConfirmAnimationTypes = "right" | "left" | "bottom" | "top" | "rotate" | "none" | "opacity" | "scale" | "zoom" | "scaleY" | "scaleX" | "rotateY" | "rotateYR" | "rotateX" | "rotateXR";

// jquery-confirm
interface JQueryConfirmOptions {
    title?: string | (() => string);
    titleClass?: string;
    type?: "default" | "blue" | "green" | "red" | "orange" | "purple" | "dark";
    typeAnimated?: boolean;
    draggable?: boolean;
    dragWindowGap?: number;
    dragWindowBorder?: boolean;
    animateFromElement?: boolean;
    alignMiddle?: boolean;
    smoothContent?: boolean;
    content?: string;
    contentLoaded?: (data: unknown, status: string, xhr: JQueryXHR) => unknown;
    buttons?: Record<string, JQueryConfirmButton>;
    icon?: string;
    lazyOpen?: boolean;
    bgOpacity?: number | null;
    theme?: "light" | "dark" | "material" | "bootstrap";
    animation?: JQueryConfirmAnimationTypes;
    closeAnimation?: JQueryConfirmAnimationTypes;
    animationSpeed?: number;
    animationBounce?: number;
    escapeKey?: boolean | string;
    rtl?: boolean;
    container?: string;
    containerFluid?: boolean;
    backgroundDismiss?: boolean | string | (() => boolean | string);
    backgroundDismisssAnimation?: string;
    autoClose?: string;
    closeIcon?: boolean | null;
    closeIconClass?: string;
    watchInterval?: number;
    columnClass?: string;
    useBootstrap?: boolean;
    boxWidth?: string;
    scrollToPreviousElement?: boolean;
    scrollToPreviousElementAnimate?: boolean;
    offsetTop?: number;
    offsetBottom?: number;
    bootstrapClasses?: Record<string, string>;
    onContentReady?: () => unknown;
    onOpenBefore?: () => unknown;
    onOpen?: () => unknown;
    onClose?: () => unknown;
    onDestroy?: () => unknown;
    onAction?: () => unknown;
}

interface JQueryStatic {
    confirm(content: string, title: string);
    confirm(options: JQueryConfirmOptions);
    alert(content: string, title: string);
    alert(options: JQueryConfirmOptions);
    jconfirm(options: JQueryConfirmOptions);
}
