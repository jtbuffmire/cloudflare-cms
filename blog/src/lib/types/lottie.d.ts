declare module 'lottie-web/build/player/lottie_light.min.js' {
    import type { AnimationItem } from 'lottie-web';
    
    interface LottieInstance {
        loadAnimation(params: {
            container: HTMLElement;
            renderer: string;
            loop: boolean;
            autoplay: boolean;
            animationData: any;
        }): AnimationItem;
    }

    const lottie: LottieInstance;
    export default lottie;
} 