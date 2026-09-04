import 'package:flutter/material.dart';

/// Animated shimmer used to wrap skeleton placeholders while data loads.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});
  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final base = scheme.surfaceContainerHighest;
    final highlight = Color.alphaBlend(
        scheme.surface.withValues(alpha: 0.6), scheme.surfaceContainerHighest);
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) => LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [base, highlight, base],
            stops: const [0.30, 0.5, 0.70],
            transform: _Slide(_c.value),
          ).createShader(bounds),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _Slide extends GradientTransform {
  const _Slide(this.value);
  final double value;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(bounds.width * (value * 2 - 1), 0, 0);
}

/// A single rounded placeholder block.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 16,
    this.radius = 8,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(radius),
        ),
      );
}

/// A list of skeleton rows for list-style screens.
class ListSkeleton extends StatelessWidget {
  const ListSkeleton({super.key, this.count = 6});
  final int count;

  @override
  Widget build(BuildContext context) => Shimmer(
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: count,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, __) => const Row(
            children: [
              SkeletonBox(width: 44, height: 44, radius: 12),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 160, height: 13),
                    SizedBox(height: 8),
                    SkeletonBox(width: 100, height: 11),
                  ],
                ),
              ),
              SkeletonBox(width: 60, height: 13),
            ],
          ),
        ),
      );
}

/// Skeleton for the dashboard: header, balance grid and a few rows.
class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SkeletonBox(height: 120, radius: 20),
          const SizedBox(height: 20),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: const [
              SkeletonBox(height: 100, radius: 16),
              SkeletonBox(height: 100, radius: 16),
              SkeletonBox(height: 100, radius: 16),
              SkeletonBox(height: 100, radius: 16),
            ],
          ),
          const SizedBox(height: 24),
          const SkeletonBox(width: 140, height: 16),
          const SizedBox(height: 16),
          ...List.generate(
            4,
            (_) => const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: SkeletonBox(height: 58, radius: 14),
            ),
          ),
        ],
      ),
    );
  }
}
