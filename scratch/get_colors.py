import sys
try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def get_dominant_colors(image_path, num_colors=5):
    img = Image.open(image_path)
    img = img.resize((150, 150))
    result = img.convert('P', palette=Image.ADAPTIVE, colors=num_colors)
    if 'A' in img.getbands():
        result.putalpha(0)
    colors = result.getcolors(150*150)
    if colors:
        colors = sorted(colors, key=lambda x: x[0], reverse=True)
        for count, color in colors:
            if isinstance(color, int):
                print(f"Index: {color}")
            else:
                print(f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}")

print("Banner.jpg colors:")
get_dominant_colors("frontend/public/assets/Banner.jpg")
print("\nLogo.jpg colors:")
get_dominant_colors("frontend/public/assets/Logo.jpg")
