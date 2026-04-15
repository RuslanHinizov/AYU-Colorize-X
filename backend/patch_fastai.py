import sys
import types
import logging

logger = logging.getLogger(__name__)

def apply_fastai_patch():
    """
    Apply monkey patches to fix FastAI 1.x compatibility issues with newer PyTorch/Python versions.
    This is required for DeOldify to work.
    """
    try:
        import torch
        
        # Patch torch.rfft / irfft
        if not hasattr(torch, 'rfft'):
            def rfft(input, signal_ndim, normalized=False, onesided=True):
                return torch.fft.rfft(input, dim=-1)
            torch.rfft = rfft

        if not hasattr(torch, 'irfft'):
            def irfft(input, signal_ndim, normalized=False, onesided=True):
                return torch.fft.irfft(input, dim=-1)
            torch.irfft = irfft

        # Patch FastAI CallbackHandler and others
        # Define dummy classes
        class DummyCallbackHandler:
            def __init__(self, callbacks=None, metrics=None, beta=None): pass
            def __call__(self, cb_name, call_mets=True, **kwargs): return False
            def on_train_begin(self, epochs, pbar, metrics): pass
            def on_epoch_begin(self): pass
            def on_batch_begin(self, xb, yb): return xb, yb
            def on_loss_begin(self, out): return out
            def on_backward_begin(self, loss): return loss
            def on_backward_end(self): pass
            def on_step_end(self): pass
            def on_batch_end(self, loss): pass
            def on_epoch_end(self, val_loss): return False
            def on_train_end(self, exception): pass

        class DummyCallback:
            def on_train_begin(self, **kwargs): pass
            def on_epoch_begin(self, **kwargs): pass
            def on_batch_begin(self, **kwargs): pass
            def on_loss_begin(self, **kwargs): pass
            def on_backward_begin(self, **kwargs): pass
            def on_backward_end(self, **kwargs): pass
            def on_step_end(self, **kwargs): pass
            def on_batch_end(self, **kwargs): pass
            def on_epoch_end(self, **kwargs): pass
            def on_train_end(self, **kwargs): pass

        class DummyLearnerCallback(DummyCallback):
            def __init__(self, learn): self.learn = learn
            
        # Try to find existing classes from installed fastai if possible
        CallbackHandler = DummyCallbackHandler
        Callback = DummyCallback
        LearnerCallback = DummyLearnerCallback
        
        try:
            from fastai.callback import CallbackHandler as RealCallbackHandler
            CallbackHandler = RealCallbackHandler
        except ImportError: pass

        try:
            from fastai.basic_train import LearnerCallback as RealLearnerCallback
            LearnerCallback = RealLearnerCallback
        except ImportError: pass

        # Ensure fastai.callback exists and has CallbackHandler
        if 'fastai.callback' not in sys.modules:
            sys.modules['fastai.callback'] = types.ModuleType('fastai.callback')
        
        if not hasattr(sys.modules['fastai.callback'], 'CallbackHandler'):
            sys.modules['fastai.callback'].CallbackHandler = CallbackHandler

        # Ensure fastai.basic_train exists and has required classes
        if 'fastai.basic_train' not in sys.modules:
            sys.modules['fastai.basic_train'] = types.ModuleType('fastai.basic_train')
        
        if not hasattr(sys.modules['fastai.basic_train'], 'CallbackHandler'):
            sys.modules['fastai.basic_train'].CallbackHandler = CallbackHandler
        
        if not hasattr(sys.modules['fastai.basic_train'], 'LearnerCallback'):
            sys.modules['fastai.basic_train'].LearnerCallback = LearnerCallback
            
        # Also inject into fastai.vision if needed
        try:
            import fastai.vision
            if not hasattr(fastai.vision, 'CallbackHandler'):
                fastai.vision.CallbackHandler = CallbackHandler
            if not hasattr(fastai.vision, 'LearnerCallback'):
                fastai.vision.LearnerCallback = LearnerCallback
        except ImportError:
            pass
            
        # NUCLEAR OPTION: Inject into builtins
        # This fixes NameError in fastai/basic_train.py where it uses CallbackHandler without importing it correctly
        import builtins
        builtins.CallbackHandler = CallbackHandler
        builtins.Callback = Callback
        builtins.LearnerCallback = LearnerCallback
        
        logger.info("FastAI monkey patches applied successfully (including builtins injection).")
        
    except Exception as e:
        logger.warning(f"Failed to apply FastAI monkey patches: {e}")
