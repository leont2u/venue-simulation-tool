from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if not created:
        return
    from profiles.models import UserProfile, _slugify_email, _unique_handle
    base   = _slugify_email(instance.email)
    handle = _unique_handle(base)
    name   = (instance.first_name or "").strip() or base
    UserProfile.objects.create(
        user=instance,
        handle=handle,
        display_name=name,
    )
