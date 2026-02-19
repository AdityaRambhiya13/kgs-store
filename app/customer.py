# ============================================================
# customer.py â€” Flet Customer Frontend (page.add pattern)
# Catalog â†’ Cart â†’ Confirm â†’ Status Tracking
# ============================================================
import flet as ft
import json
import time
import threading
import urllib.request
import urllib.error
import urllib.parse

API_BASE = "http://localhost:8000"

# â”€â”€ Color Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
PRIMARY = "#1E3A8A"
PRIMARY_LIGHT = "#3B5FCA"
SECONDARY = "#10B981"
ACCENT = "#F59E0B"
BG_LIGHT = "#F0F4FF"
BG_DARK = "#0F172A"
CARD_LIGHT = "#FFFFFF"
CARD_DARK = "#1E293B"
TEXT_LIGHT = "#1E293B"
TEXT_DARK = "#F1F5F9"
SURFACE_LIGHT = "#E2E8F0"
SURFACE_DARK = "#334155"
DANGER = "#EF4444"
SUCCESS = "#10B981"


# â”€â”€ API Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def api_get(endpoint):
    try:
        req = urllib.request.Request(f"{API_BASE}{endpoint}")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"API GET Error: {e}")
        return None


def api_post(endpoint, data):
    try:
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(f"{API_BASE}{endpoint}", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        try:
            return {"error": json.loads(error_body).get("detail", str(e))}
        except Exception:
            return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}


def build_customer_ui(page: ft.Page):
    """Build the full customer UI using page.add()."""

    # â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cart = {}
    products_data = []
    polling_active = [False]

    def txt_color():
        return TEXT_DARK if page.theme_mode == ft.ThemeMode.DARK else TEXT_LIGHT

    def card_color():
        return CARD_DARK if page.theme_mode == ft.ThemeMode.DARK else CARD_LIGHT

    def surface_color():
        return SURFACE_DARK if page.theme_mode == ft.ThemeMode.DARK else SURFACE_LIGHT

    def bg_color():
        return BG_DARK if page.theme_mode == ft.ThemeMode.DARK else BG_LIGHT

    # â”€â”€ Content Area (swapped per screen) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    content = ft.Column(scroll=ft.ScrollMode.AUTO, expand=True, spacing=0)

    def cart_count():
        return sum(item["quantity"] for item in cart.values())

    # â”€â”€ Cart Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    badge_text = ft.Text("0", size=10, color="white", weight=ft.FontWeight.BOLD)
    badge = ft.Container(
        content=badge_text, bgcolor=DANGER, border_radius=10,
        width=20, height=20, alignment=ft.Alignment(0, 0), visible=False,
    )

    def update_badge():
        c = cart_count()
        badge_text.value = str(c)
        badge.visible = c > 0

    # â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def toggle_theme(e):
        page.theme_mode = ft.ThemeMode.DARK if page.theme_mode == ft.ThemeMode.LIGHT else ft.ThemeMode.LIGHT
        page.bgcolor = bg_color()
        show_catalog()

    nav = ft.Container(
        content=ft.Row(
            controls=[
                ft.Row([
                    ft.Icon(ft.Icons.STOREFRONT_ROUNDED, color=PRIMARY, size=28),
                    ft.Text("Quick Shop", size=20, weight=ft.FontWeight.BOLD, color=PRIMARY),
                ], spacing=8),
                ft.Row([
                    ft.IconButton(ft.Icons.DARK_MODE_ROUNDED, icon_color=TEXT_LIGHT,
                                  tooltip="Toggle Dark Mode", on_click=toggle_theme),
                    ft.Container(
                        content=ft.Stack([
                            ft.IconButton(ft.Icons.SHOPPING_CART_ROUNDED, icon_color=PRIMARY,
                                          icon_size=26, tooltip="Cart", on_click=lambda e: show_cart()),
                            ft.Container(content=badge, right=2, top=2),
                        ], width=44, height=44),
                    ),
                ], spacing=0),
            ],
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
        ),
        padding=ft.padding.symmetric(horizontal=16, vertical=8),
        bgcolor=CARD_LIGHT,
        shadow=ft.BoxShadow(spread_radius=0, blur_radius=8,
                             color=ft.Colors.with_opacity(0.06, "black"),
                             offset=ft.Offset(0, 2)),
    )

    # â”€â”€ Hero Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    hero = ft.Container(
        content=ft.Column([
            ft.Text("ðŸ›’ Quick Shop", size=34, weight=ft.FontWeight.W_800,
                     color="white", text_align=ft.TextAlign.CENTER),
            ft.Text("No Wait â€” Just Shop!", size=16,
                     color=ft.Colors.with_opacity(0.9, "white"),
                     text_align=ft.TextAlign.CENTER, weight=ft.FontWeight.W_300),
            ft.Container(height=6),
            ft.Text("Browse â€¢ Add to Cart â€¢ Get Your Token â€¢ Pick Up!", size=12,
                     color=ft.Colors.with_opacity(0.7, "white"),
                     text_align=ft.TextAlign.CENTER),
        ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
        gradient=ft.LinearGradient(
            begin=ft.Alignment(-1, -1), end=ft.Alignment(1, 1),
            colors=[PRIMARY, PRIMARY_LIGHT, "#6366F1"],
        ),
        padding=ft.padding.symmetric(vertical=36, horizontal=16),
        border_radius=ft.border_radius.only(bottom_left=20, bottom_right=20),
    )

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # CATALOG
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def build_product_card(product):
        pid = product["id"]
        qty = cart.get(pid, {}).get("quantity", 0)
        qty_text = ft.Text(str(qty), size=18, weight=ft.FontWeight.BOLD,
                           color=PRIMARY, width=30, text_align=ft.TextAlign.CENTER)

        def change_qty(delta):
            def handler(e):
                current = cart.get(pid, {}).get("quantity", 0)
                new_val = max(0, min(10, current + delta))
                if new_val == 0 and pid in cart:
                    del cart[pid]
                elif new_val > 0:
                    cart[pid] = {"name": product["name"], "price": product["price"],
                                 "quantity": new_val, "product_id": pid}
                qty_text.value = str(new_val)
                update_badge()
                page.update()
            return handler

        return ft.Container(
            content=ft.Column([
                ft.Container(
                    content=ft.Image(src=product["image_url"], width=160, height=110,
                                      fit=ft.BoxFit.COVER,
                                      border_radius=ft.border_radius.only(top_left=12, top_right=12)),
                    clip_behavior=ft.ClipBehavior.ANTI_ALIAS,
                    border_radius=ft.border_radius.only(top_left=12, top_right=12),
                ),
                ft.Container(
                    content=ft.Column([
                        ft.Text(product["name"], size=13, weight=ft.FontWeight.W_600,
                                color=txt_color(), max_lines=2, overflow=ft.TextOverflow.ELLIPSIS),
                        ft.Text(product.get("description", ""), size=10,
                                color=ft.Colors.with_opacity(0.6, txt_color()),
                                max_lines=2, overflow=ft.TextOverflow.ELLIPSIS),
                        ft.Container(height=2),
                        ft.Row([
                            ft.Text(f"â‚¹{product['price']:.0f}", size=17, weight=ft.FontWeight.BOLD, color=SECONDARY),
                            ft.Container(
                                content=ft.Text(product.get("category", ""), size=9, color=PRIMARY,
                                                weight=ft.FontWeight.W_500),
                                bgcolor=ft.Colors.with_opacity(0.1, PRIMARY),
                                border_radius=8, padding=ft.padding.symmetric(horizontal=6, vertical=2),
                            ),
                        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                        ft.Divider(height=1, color=surface_color()),
                        ft.Row([
                            ft.IconButton(ft.Icons.REMOVE_CIRCLE_ROUNDED, icon_color=DANGER, icon_size=26,
                                          on_click=change_qty(-1)),
                            qty_text,
                            ft.IconButton(ft.Icons.ADD_CIRCLE_ROUNDED, icon_color=SECONDARY, icon_size=26,
                                          on_click=change_qty(1)),
                        ], alignment=ft.MainAxisAlignment.CENTER, spacing=0),
                    ], spacing=3),
                    padding=ft.padding.only(left=10, right=10, bottom=6, top=4),
                ),
            ], spacing=0),
            bgcolor=card_color(),
            border_radius=12,
            shadow=ft.BoxShadow(spread_radius=0, blur_radius=10,
                                 color=ft.Colors.with_opacity(0.07, "black"),
                                 offset=ft.Offset(0, 4)),
            width=175,
        )

    def show_catalog():
        nonlocal products_data
        polling_active[0] = False
        content.controls.clear()

        if not products_data:
            products_data = api_get("/api/products") or []

        if not products_data:
            content.controls.append(ft.Container(
                content=ft.Column([
                    ft.Icon(ft.Icons.ERROR_OUTLINE, size=60, color=DANGER),
                    ft.Text("Could not load products", size=18, color=DANGER),
                    ft.Text("Make sure API server is running", size=13, color=SURFACE_DARK),
                    ft.ElevatedButton("Retry", on_click=lambda e: show_catalog(), bgcolor=PRIMARY, color="white"),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=10),
                padding=60, alignment=ft.Alignment(0, 0),
            ))
            page.update()
            return

        grid = ft.ResponsiveRow([
            ft.Container(content=build_product_card(p),
                          col={"xs": 6, "sm": 4, "md": 3, "lg": 2.4}, padding=5)
            for p in products_data
        ], spacing=0, run_spacing=0)

        content.controls = [
            hero,
            ft.Container(
                content=ft.Column([
                    ft.Container(height=10),
                    ft.Text(f"ðŸ›ï¸ All Products ({len(products_data)})", size=19,
                            weight=ft.FontWeight.W_700, color=txt_color()),
                    ft.Container(height=6),
                    grid,
                    ft.Container(height=32),
                ], spacing=0),
                padding=ft.padding.symmetric(horizontal=12),
            ),
        ]
        update_badge()
        page.update()

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # CART
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def show_cart():
        polling_active[0] = False
        content.controls.clear()

        if not cart:
            content.controls.append(ft.Container(
                content=ft.Column([
                    ft.Container(height=60),
                    ft.Icon(ft.Icons.SHOPPING_CART_OUTLINED, size=70, color=SURFACE_DARK),
                    ft.Text("Your cart is empty", size=20, weight=ft.FontWeight.W_600, color=txt_color()),
                    ft.Text("Browse products and add items", size=14, color=SURFACE_DARK),
                    ft.Container(height=16),
                    ft.ElevatedButton("ðŸ›ï¸ Browse Products", on_click=lambda e: show_catalog(),
                                       bgcolor=PRIMARY, color="white",
                                       style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=12),
                                                            padding=ft.padding.symmetric(horizontal=30, vertical=14))),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=8),
                alignment=ft.Alignment(0, 0), padding=40,
            ))
            page.update()
            return

        total = sum(item["price"] * item["quantity"] for item in cart.values())

        items_list = []
        for pid, item in cart.items():
            sub = item["price"] * item["quantity"]
            items_list.append(ft.Container(
                content=ft.Row([
                    ft.Column([
                        ft.Text(item["name"], size=14, weight=ft.FontWeight.W_600, color=txt_color()),
                        ft.Text(f"â‚¹{item['price']:.0f} Ã— {item['quantity']}", size=12, color=SURFACE_DARK),
                    ], spacing=2, expand=True),
                    ft.Text(f"â‚¹{sub:.0f}", size=16, weight=ft.FontWeight.BOLD, color=SECONDARY),
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                padding=ft.padding.symmetric(horizontal=16, vertical=12),
                bgcolor=card_color(), border_radius=10, margin=ft.margin.only(bottom=8),
            ))

        content.controls = [ft.Container(
            content=ft.Column([
                ft.Container(height=16),
                ft.Row([
                    ft.IconButton(ft.Icons.ARROW_BACK_ROUNDED, icon_color=PRIMARY,
                                  on_click=lambda e: show_catalog()),
                    ft.Text("ðŸ›’ Your Cart", size=22, weight=ft.FontWeight.W_700, color=txt_color()),
                ], spacing=4),
                ft.Container(height=8),
                *items_list,
                ft.Divider(color=surface_color()),
                ft.Container(
                    content=ft.Row([
                        ft.Text("Total", size=18, weight=ft.FontWeight.W_700, color=txt_color()),
                        ft.Text(f"â‚¹{total:.0f}", size=22, weight=ft.FontWeight.W_800, color=PRIMARY),
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    padding=ft.padding.symmetric(horizontal=16, vertical=12),
                    bgcolor=ft.Colors.with_opacity(0.05, PRIMARY), border_radius=12,
                ),
                ft.Container(height=16),
                ft.Row([
                    ft.OutlinedButton("ðŸ—‘ï¸ Clear", on_click=lambda e: (cart.clear(), show_cart()),
                                       style=ft.ButtonStyle(color=DANGER, side=ft.BorderSide(1, DANGER),
                                                            shape=ft.RoundedRectangleBorder(radius=12),
                                                            padding=ft.padding.symmetric(horizontal=20, vertical=12))),
                    ft.ElevatedButton("âœ… Confirm Order", on_click=lambda e: show_confirm(),
                                       bgcolor=SECONDARY, color="white",
                                       style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=12),
                                                            padding=ft.padding.symmetric(horizontal=28, vertical=12))),
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                ft.Container(height=32),
            ], spacing=4),
            padding=ft.padding.symmetric(horizontal=16),
        )]
        update_badge()
        page.update()

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # CONFIRM
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def show_confirm():
        content.controls.clear()

        phone_field = ft.TextField(
            label="Phone Number", hint_text="Enter 10-digit number",
            prefix_text="+91 ", keyboard_type=ft.KeyboardType.PHONE,
            max_length=10, border_radius=12, border_color=PRIMARY,
            focused_border_color=SECONDARY, text_size=16,
        )
        error_text = ft.Text("", color=DANGER, size=12, visible=False)
        loading = ft.ProgressRing(width=20, height=20, stroke_width=2, visible=False)

        def submit_order(e):
            phone = (phone_field.value or "").strip()
            if len(phone) != 10 or not phone.isdigit():
                error_text.value = "Please enter a valid 10-digit phone number"
                error_text.visible = True
                page.update()
                return

            error_text.visible = False
            loading.visible = True
            page.update()

            total = sum(item["price"] * item["quantity"] for item in cart.values())
            items = [{"product_id": pid, "name": item["name"],
                      "price": item["price"], "quantity": item["quantity"]}
                     for pid, item in cart.items()]

            result = api_post("/api/orders", {"phone": phone, "items": items, "total": total})
            loading.visible = False

            if result and "error" not in result:
                token = result["token"]
                cart.clear()
                show_status(token, just_placed=True)
            else:
                err_msg = result.get("error", "Something went wrong") if result else "Server unreachable"
                error_text.value = f"âŒ {err_msg}"
                error_text.visible = True
                page.update()

        total = sum(item["price"] * item["quantity"] for item in cart.values())

        content.controls = [ft.Container(
            content=ft.Column([
                ft.Container(height=20),
                ft.Row([
                    ft.IconButton(ft.Icons.ARROW_BACK_ROUNDED, icon_color=PRIMARY,
                                  on_click=lambda e: show_cart()),
                    ft.Text("ðŸ“‹ Confirm Order", size=22, weight=ft.FontWeight.W_700, color=txt_color()),
                ], spacing=4),
                ft.Container(height=16),
                ft.Container(
                    content=ft.Column([
                        ft.Text("Order Summary", size=16, weight=ft.FontWeight.W_600, color=txt_color()),
                        ft.Divider(color=surface_color()),
                        ft.Text(f"Items: {cart_count()}", size=14, color=SURFACE_DARK),
                        ft.Text(f"Total: â‚¹{total:.0f}", size=20, weight=ft.FontWeight.BOLD, color=SECONDARY),
                    ], spacing=8),
                    padding=20, bgcolor=card_color(), border_radius=16,
                    shadow=ft.BoxShadow(spread_radius=0, blur_radius=10,
                                         color=ft.Colors.with_opacity(0.06, "black"),
                                         offset=ft.Offset(0, 3)),
                ),
                ft.Container(height=20),
                ft.Text("Enter your phone number:", size=14, color=txt_color()),
                ft.Container(height=8),
                phone_field,
                error_text,
                ft.Container(height=16),
                ft.Row([loading, ft.ElevatedButton("ðŸŽ‰ Place Order", on_click=submit_order,
                                                     bgcolor=PRIMARY, color="white",
                                                     style=ft.ButtonStyle(
                                                         shape=ft.RoundedRectangleBorder(radius=12),
                                                         padding=ft.padding.symmetric(horizontal=36, vertical=14)))],
                       alignment=ft.MainAxisAlignment.CENTER, spacing=12),
                ft.Container(height=32),
            ], spacing=4),
            padding=ft.padding.symmetric(horizontal=20),
        )]
        update_badge()
        page.update()

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # STATUS TRACKING
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def show_status(token, just_placed=False):
        polling_active[0] = True
        content.controls.clear()

        status_icon = ft.Icon(ft.Icons.HOURGLASS_TOP_ROUNDED, size=56, color=ACCENT)
        status_txt = ft.Text(
            "Processing your order..." if just_placed else "Checking status...",
            size=17, weight=ft.FontWeight.W_600, color=txt_color(), text_align=ft.TextAlign.CENTER,
        )
        status_sub = ft.Text("We're preparing your items", size=14,
                              color=SURFACE_DARK, text_align=ft.TextAlign.CENTER)

        token_box = ft.Container(
            content=ft.Column([
                ft.Text("Your Token", size=13, color=ft.Colors.with_opacity(0.8, "white")),
                ft.Text(token, size=32, weight=ft.FontWeight.W_800, color="white",
                         text_align=ft.TextAlign.CENTER),
            ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
            gradient=ft.LinearGradient(begin=ft.Alignment(-1, -1), end=ft.Alignment(1, 1),
                                        colors=[PRIMARY, "#6366F1"]),
            padding=ft.padding.symmetric(vertical=22, horizontal=36),
            border_radius=20,
            shadow=ft.BoxShadow(spread_radius=0, blur_radius=16,
                                 color=ft.Colors.with_opacity(0.25, PRIMARY),
                                 offset=ft.Offset(0, 6)),
        )

        status_card = ft.Container(
            content=ft.Column([status_icon, status_txt, status_sub],
                               horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=8),
            padding=24, bgcolor=card_color(), border_radius=16,
            shadow=ft.BoxShadow(spread_radius=0, blur_radius=10,
                                 color=ft.Colors.with_opacity(0.06, "black"),
                                 offset=ft.Offset(0, 3)),
        )

        content.controls = [ft.Container(
            content=ft.Column([
                ft.Container(height=36),
                ft.Text("ðŸŽ‰ Order Placed!" if just_placed else "ðŸ“‹ Order Status",
                         size=26, weight=ft.FontWeight.W_800, color=txt_color(),
                         text_align=ft.TextAlign.CENTER),
                ft.Container(height=20),
                token_box,
                ft.Container(height=28),
                status_card,
                ft.Container(height=20),
                ft.ElevatedButton("ðŸ›ï¸ New Order", on_click=lambda e: new_order(),
                                   bgcolor=PRIMARY, color="white",
                                   style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=12),
                                                        padding=ft.padding.symmetric(horizontal=30, vertical=12))),
                ft.Container(height=36),
            ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=0),
            padding=ft.padding.symmetric(horizontal=20), alignment=ft.Alignment(0, 0),
        )]
        update_badge()
        page.update()

        # Poll for status updates every 5 seconds
        def poll():
            while polling_active[0]:
                time.sleep(5)
                if not polling_active[0]:
                    break
                try:
                    order = api_get(f"/api/orders/{token}")
                    if order and order.get("status") == "Ready for Pickup":
                        status_icon.name = ft.Icons.CHECK_CIRCLE_ROUNDED
                        status_icon.color = SUCCESS
                        status_icon.size = 64
                        status_txt.value = f"âœ… Token {token} â€” Ready!"
                        status_txt.color = SUCCESS
                        status_sub.value = "Please collect your order from the counter"
                        token_box.gradient = ft.LinearGradient(
                            begin=ft.Alignment(-1, -1), end=ft.Alignment(1, 1),
                            colors=[SECONDARY, "#059669"])
                        token_box.shadow = ft.BoxShadow(
                            spread_radius=0, blur_radius=16,
                            color=ft.Colors.with_opacity(0.25, SECONDARY),
                            offset=ft.Offset(0, 6))
                        page.update()
                        polling_active[0] = False
                        break
                except Exception:
                    pass
        threading.Thread(target=poll, daemon=True).start()

    def new_order():
        polling_active[0] = False
        show_catalog()

    # â”€â”€ Initial Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    page.bgcolor = bg_color()
    show_catalog()
    page.add(nav, content)
