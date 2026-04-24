from django.http import FileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .poly_pizza import (
    PolyPizzaError,
    cached_model_file,
    cached_thumbnail_file,
    search_models,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def poly_pizza_assets(request):
    try:
        payload = search_models(
            request=request,
            keyword=request.query_params.get("q", ""),
            page=int(request.query_params.get("page", 0)),
            limit=int(request.query_params.get("limit", 32)),
            category=request.query_params.get("category"),
            license_filter=request.query_params.get("license"),
            preset=request.query_params.get("preset", "venue"),
        )
    except (PolyPizzaError, ValueError) as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(payload)


@api_view(["GET"])
@permission_classes([AllowAny])
def poly_pizza_model(request, model_id):
    try:
        path, content_type = cached_model_file(model_id)
    except PolyPizzaError as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

    return FileResponse(path.open("rb"), content_type=content_type)


@api_view(["GET"])
@permission_classes([AllowAny])
def poly_pizza_thumbnail(request, model_id):
    try:
        path, content_type = cached_thumbnail_file(model_id)
    except PolyPizzaError as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

    return FileResponse(path.open("rb"), content_type=content_type)
