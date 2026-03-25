#!/usr/bin/env python3
"""
Package skill with UTF-8 encoding support
"""
import sys
import os
import zipfile
from pathlib import Path

def should_exclude(path):
    """Check if a path should be excluded from packaging"""
    exclude_patterns = [
        '.skill',               # 打包输出文件
        'node_modules',
        'unpacked_',
        '.backup',
        'test_output.pptx',     # 测试生成的输出文件
        'package_skill_utf8.py', # 打包脚本本身
        '__pycache__',
        '.pyc',
        '.git',
        '.DS_Store'
    ]

    # test_layout.md 和 TEST_REPORT.md 是必要的测试文件，不排除

    path_str = str(path)
    for pattern in exclude_patterns:
        if pattern in path_str:
            return True
    return False

def package_skill(skill_path, output_dir=None):
    """Package a skill into a .skill file"""
    skill_path = Path(skill_path)
    skill_name = skill_path.name

    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
    else:
        output_dir = skill_path.parent

    output_file = output_dir / f"{skill_name}.skill"

    print(f"Packaging skill: {skill_path}")
    print(f"Output: {output_file}")

    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in skill_path.rglob('*'):
            if file_path.is_file() and not should_exclude(file_path):
                arcname = file_path.relative_to(skill_path.parent)
                print(f"  Adding: {arcname}")
                zf.write(file_path, arcname)

    print(f"\nSuccess! Created {output_file}")
    print(f"Size: {output_file.stat().st_size / 1024:.1f} KB")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python package_skill_utf8.py <skill-path> [output-dir]")
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    if package_skill(skill_path, output_dir):
        sys.exit(0)
    else:
        sys.exit(1)
