from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="community.LayoutLike")
def notify_layout_liked(sender, instance, created, **kwargs):
    if not created:
        return
    layout    = instance.published_layout
    recipient = layout.publisher
    actor     = instance.user
    # Don't notify if you liked your own layout
    if recipient == actor:
        return
    from notifications.models import Notification
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        ntype=Notification.LIKE,
        layout=layout,
    )


@receiver(post_save, sender="projects.Project")
def notify_layout_forked(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.forked_from_id:
        return
    try:
        source_owner = instance.forked_from.owner
    except Exception:
        return
    actor = instance.owner
    if source_owner == actor:
        return
    from notifications.models import Notification
    from community.models import PublishedLayout
    try:
        listing = PublishedLayout.objects.get(project=instance.forked_from)
    except PublishedLayout.DoesNotExist:
        listing = None
    Notification.objects.create(
        recipient=source_owner,
        actor=actor,
        ntype=Notification.FORK,
        layout=listing,
        project=instance.forked_from,
    )


@receiver(post_save, sender="community.PublishedLayout")
def notify_layout_approved(sender, instance, created, **kwargs):
    if created:
        return
    # Fire only when transitioning to APPROVED
    if instance.moderation_status != "APPROVED":
        return
    # Avoid duplicate notifications: check if one already exists for this layout
    from notifications.models import Notification
    already = Notification.objects.filter(
        recipient=instance.publisher,
        ntype=Notification.APPROVED,
        layout=instance,
    ).exists()
    if already:
        return
    Notification.objects.create(
        recipient=instance.publisher,
        ntype=Notification.APPROVED,
        layout=instance,
    )
