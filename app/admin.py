# ============================================================
# admin.py â€” Flet Admin Dashboard (page.add pattern)
# Password-protected order management
# ============================================================
import flet as ft
import json
import time
import threading
import urllib.request
import urllib.error
import urllib.parse
import os

API_BASE = "http://localhost:8000"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
PRIMARY = "#1E3A8A"
PRIMARY_LIGHT = "#3B5FCA"
SECONDARY = "#10B981"
ACCENT = "#F59E0B"
BG_LIGHT = "#F0F4FF"
CARD_LIGHT = "#FFFFFF"
TEXT_LIGHT = "#1E293B"
SURFACE_LIGHT = "#E2E8F0"
SURFACE_DARK = "#334155"
DANGER = "#EF4444"
SUCCESS = "#10B981"
WARNING = "#F59E0B"


def api_get(endpoint):
    try:
        req = urllib.request.Request(f"{API_BASE}{endpoint}")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Admin API Error: {e}")
        return None

def api_patch(endpoint, data):
    try:
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(f"{API_BASE}{endpoint}", data=body, method="PATCH")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Admin PATCH Error: {e}")
        return None


def build_admin_ui(page: ft.Page):
    """Build the admin dashboard using page.add()."""

    orders_data = []
    polling_active = [False]
    content = ft.Column(scroll=ft.ScrollMode.AUTO, expand=True, spacing=0)

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # LOGIN
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def show_login():
        content.controls.clear()

        pw_field = ft.TextField(
            label="Admin Password", password=True, can_reveal_password=True,
            border_radius=12, border_color=PRIMARY, focused_border_color=SECONDARY,
            text_size=16, width=300, on_submit=lambda e: do_login(None),
        )
        err = ft.Text("", color=DANGER, size=13, visible=False)

        def do_login(e):
            if (pw_field.value or "") == ADMIN_PASSWORD:
                show_dashboard()
            else:
                err.value = "âŒ Incorrect password"
                err.visible = True
                page.update()

        content.controls = [ft.Container(
            content=ft.Column([
                ft.Container(height=80),
                ft.Container(
                    content=ft.Icon(ft.Icons.ADMIN_PANEL_SETTINGS_ROUNDED, size=60, color="white"),
                    width=110, height=110, border_radius=55,
                    gradient=ft.LinearGradient(begin=ft.Alignment(-1, -1), end=ft.Alignment(1, 1),
                                                colors=[PRIMARY, "#6366F1"]),
                    alignment=ft.Alignment(0, 0),
                    shadow=ft.BoxShadow(spread_radius=0, blur_radius=16,
                                         color=ft.Colors.with_opacity(0.2, PRIMARY),
                                         offset=ft.Offset(0, 6)),
                ),
                ft.Container(height=20),
                ft.Text("Admin Dashboard", size=26, weight=ft.FontWeight.W_800, color=TEXT_LIGHT),
                ft.Text("Enter password to manage orders", size=14, color=SURFACE_DARK),
                ft.Container(height=20),
                pw_field, err,
                ft.Container(height=16),
                ft.ElevatedButton("ðŸ”“ Login", on_click=do_login, bgcolor=PRIMARY, color="white",
                                   style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=12),
                                                        padding=ft.padding.symmetric(horizontal=44, vertical=14))),
            ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=4),
            alignment=ft.Alignment(0, 0), expand=True,
        )]
        page.update()

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    # DASHBOARD
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    def show_dashboard():
        polling_active[0] = True
        refresh_orders()

        def poll():
            while polling_active[0]:
                time.sleep(5)
                if not polling_active[0]:
                    break
                try:
                    refresh_orders()
                except Exception:
                    pass
        threading.Thread(target=poll, daemon=True).start()

    def refresh_orders():
        nonlocal orders_data
        pw = urllib.parse.quote(ADMIN_PASSWORD)
        data = api_get(f"/api/orders?password={pw}")
        if data is not None:
            orders_data = data
        render_dashboard()

    def render_dashboard():
        content.controls.clear()

        processing = [o for o in orders_data if o["status"] == "Processing"]
        ready = [o for o in orders_data if o["status"] == "Ready for Pickup"]

        # Header bar
        header = ft.Container(
            content=ft.Row([
                ft.Row([ft.Icon(ft.Icons.DASHBOARD_ROUNDED, color="white", size=26),
                        ft.Text("Admin Dashboard", size=20, weight=ft.FontWeight.BOLD, color="white")], spacing=8),
                ft.IconButton(ft.Icons.REFRESH_ROUNDED, icon_color="white", tooltip="Refresh",
                              on_click=lambda e: refresh_orders()),
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
            padding=ft.padding.symmetric(horizontal=16, vertical=12),
            gradient=ft.LinearGradient(begin=ft.Alignment(-1, 0), end=ft.Alignment(1, 0),
                                        colors=[PRIMARY, "#6366F1"]),
        )

        # Stat cards
        def stat(label, val, color, icon):
            return ft.Container(
                content=ft.Row([
                    ft.Container(content=ft.Icon(icon, color="white", size=22),
                                 width=44, height=44, border_radius=11, bgcolor=color, alignment=ft.Alignment(0, 0)),
                    ft.Column([
                        ft.Text(str(val), size=22, weight=ft.FontWeight.BOLD, color=TEXT_LIGHT),
                        ft.Text(label, size=11, color=SURFACE_DARK),
                    ], spacing=0),
                ], spacing=10),
                padding=14, bgcolor=CARD_LIGHT, border_radius=14,
                shadow=ft.BoxShadow(spread_radius=0, blur_radius=6,
                                     color=ft.Colors.with_opacity(0.05, "black"),
                                     offset=ft.Offset(0, 2)),
                expand=True,
            )

        stats = ft.ResponsiveRow([
            ft.Container(content=stat("Total", len(orders_data), PRIMARY, ft.Icons.RECEIPT_LONG_ROUNDED),
                          col={"xs": 12, "sm": 4}, padding=4),
            ft.Container(content=stat("Processing", len(processing), WARNING, ft.Icons.HOURGLASS_TOP_ROUNDED),
                          col={"xs": 6, "sm": 4}, padding=4),
            ft.Container(content=stat("Ready", len(ready), SUCCESS, ft.Icons.CHECK_CIRCLE_ROUNDED),
                          col={"xs": 6, "sm": 4}, padding=4),
        ])

        # Order cards
        cards = []
        if not orders_data:
            cards.append(ft.Container(
                content=ft.Column([
                    ft.Icon(ft.Icons.INBOX_ROUNDED, size=60, color=SURFACE_LIGHT),
                    ft.Text("No orders yet", size=18, color=SURFACE_DARK),
                    ft.Text("Orders will appear automatically", size=13, color=SURFACE_LIGHT),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=8),
                padding=60, alignment=ft.Alignment(0, 0),
            ))
        else:
            for order in orders_data:
                cards.append(build_order_card(order))

        content.controls = [
            header,
            ft.Container(
                content=ft.Column([
                    ft.Container(height=10),
                    stats,
                    ft.Container(height=14),
                    ft.Text("ðŸ“‹ Orders", size=18, weight=ft.FontWeight.W_700, color=TEXT_LIGHT),
                    ft.Container(height=6),
                    *cards,
                    ft.Container(height=32),
                ], spacing=4),
                padding=ft.padding.symmetric(horizontal=14),
            ),
        ]
        page.update()

    def build_order_card(order):
        is_proc = order["status"] == "Processing"
        s_color = WARNING if is_proc else SUCCESS
        s_icon = ft.Icons.HOURGLASS_TOP_ROUNDED if is_proc else ft.Icons.CHECK_CIRCLE_ROUNDED

        try:
            items = json.loads(order["items_json"])
        except Exception:
            items = []

        items_col = ft.Column([
            ft.Container(
                content=ft.Row([
                    ft.Text(it.get("name", "?"), size=13, color=TEXT_LIGHT, expand=True),
                    ft.Text(f"Ã—{it.get('quantity', 0)}", size=13, weight=ft.FontWeight.W_600, color=PRIMARY),
                    ft.Text(f"â‚¹{it.get('subtotal', it.get('price',0)*it.get('quantity',0)):.0f}",
                            size=13, weight=ft.FontWeight.BOLD, color=SECONDARY),
                ], spacing=8),
                padding=ft.padding.symmetric(vertical=3),
            )
            for it in items
        ], visible=False, spacing=0)

        divider = ft.Divider(color=SURFACE_LIGHT, visible=False)

        def toggle_detail(e):
            items_col.visible = not items_col.visible
            divider.visible = items_col.visible
            page.update()

        def toggle_status(e):
            new = "Ready for Pickup" if is_proc else "Processing"
            pw = urllib.parse.quote(ADMIN_PASSWORD)
            api_patch(f"/api/orders/{order['token']}/status?password={pw}", {"status": new})
            refresh_orders()

        return ft.Container(
            content=ft.Column([
                ft.Container(
                    content=ft.Row([
                        ft.Column([
                            ft.Row([
                                ft.Text(order["token"], size=17, weight=ft.FontWeight.BOLD, color=PRIMARY),
                                ft.Container(
                                    content=ft.Row([
                                        ft.Icon(s_icon, color="white", size=13),
                                        ft.Text(order["status"], size=10, color="white", weight=ft.FontWeight.W_600),
                                    ], spacing=3),
                                    bgcolor=s_color, border_radius=10,
                                    padding=ft.padding.symmetric(horizontal=8, vertical=3),
                                ),
                            ], spacing=8),
                            ft.Row([
                                ft.Icon(ft.Icons.PHONE_ROUNDED, size=13, color=SURFACE_DARK),
                                ft.Text(f"+91 {order['phone']}", size=12, color=SURFACE_DARK),
                                ft.Text("â€¢", color=SURFACE_LIGHT),
                                ft.Text(order["timestamp"], size=11, color=SURFACE_DARK),
                            ], spacing=4),
                        ], spacing=4, expand=True),
                        ft.Text(f"â‚¹{order['total']:.0f}", size=18, weight=ft.FontWeight.BOLD, color=SECONDARY),
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    on_click=toggle_detail, ink=True,
                ),
                divider, items_col,
                ft.Row([
                    ft.Text(f"{len(items)} item(s)", size=12, color=SURFACE_DARK),
                    ft.ElevatedButton(
                        "Mark Ready âœ…" if is_proc else "Mark Processing â³",
                        on_click=toggle_status,
                        bgcolor=SECONDARY if is_proc else WARNING, color="white",
                        style=ft.ButtonStyle(shape=ft.RoundedRectangleBorder(radius=10),
                                             padding=ft.padding.symmetric(horizontal=14, vertical=8)),
                    ),
                ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
            ], spacing=8),
            padding=14, bgcolor=CARD_LIGHT, border_radius=14,
            border=ft.border.only(left=ft.BorderSide(4, s_color)),
            shadow=ft.BoxShadow(spread_radius=0, blur_radius=6,
                                 color=ft.Colors.with_opacity(0.05, "black"),
                                 offset=ft.Offset(0, 2)),
            margin=ft.margin.only(bottom=8),
        )

    # â”€â”€ Initial Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    page.bgcolor = BG_LIGHT
    show_login()
    page.add(content)
