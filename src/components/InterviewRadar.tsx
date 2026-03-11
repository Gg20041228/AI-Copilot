import ReactECharts from "echarts-for-react";

export const InterviewRadar = ({
  scores,
}: {
  scores: { item: string; score: number }[];
}) => {
  const indicators = scores.map((s) => ({ name: s.item, max: 100 }));
  const dataValues = scores.map((s) => s.score);

  const option = {
    radar: {
      indicator: indicators,
      radius: "65%",
      axisName: { color: "#888" },
      splitArea: { show: false },
      splitLine: { lineStyle: { color: ["#eee"] } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: dataValues,
            name: "综合能力",
            areaStyle: { color: "rgba(22, 119, 255, 0.2)" },
            lineStyle: { color: "#1677ff", width: 2 },
            itemStyle: { color: "#1677ff" },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px" }} />;
};
